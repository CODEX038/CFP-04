/**
 * routes/campaignSyncRoute.js
 *
 * Adds a sync endpoint that reads amountRaised from Ethereum and
 * updates MongoDB so the Admin Dashboard shows correct ETH stats.
 *
 * POST /api/campaigns/sync-raised
 *
 * Also patches the GET /api/campaigns response to include
 * on-chain amountRaised when available.
 *
 * Usage in server.js:
 *   import campaignSyncRoute from './routes/campaignSyncRoute.js'
 *   app.use('/api/campaigns', campaignSyncRoute)   // BEFORE your main campaign router
 */

import { Router }  from 'express'
import { ethers }  from 'ethers'
import Campaign    from '../models/Campaign.js'
import { protect, adminOnly } from '../middleware/auth.js'

const router = Router()

/* ── Minimal ABI — only what we need ── */
const CAMPAIGN_ABI = [
  { type:'function', name:'amountRaised', inputs:[], outputs:[{ type:'uint256' }], stateMutability:'view' },
  { type:'function', name:'claimed',      inputs:[], outputs:[{ type:'bool'    }], stateMutability:'view' },
  { type:'function', name:'paused',       inputs:[], outputs:[{ type:'bool'    }], stateMutability:'view' },
  {
    type:'event', name:'Funded',
    inputs:[
      { type:'address', name:'funder', indexed:true },
      { type:'uint256', name:'amount', indexed:false },
    ],
  },
]

function getProvider() {
  /* Fallback chain: env var → publicnode → ankr → official */
  const rpc = process.env.SEPOLIA_RPC_URL
    || 'https://rpc2.sepolia.org'
  return new ethers.JsonRpcProvider(rpc)
}

async function getWorkingProvider() {
  const rpcs = [
    process.env.RPC_URL,
    process.env.SEPOLIA_RPC_URL,
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://sepolia.drpc.org',
    'https://1rpc.io/sepolia',
  ].filter(Boolean)

  for (const rpc of rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc)
      await provider.getBlockNumber()
      console.log('[SyncRoute] Using RPC:', rpc)
      return provider
    } catch {
      console.warn('[SyncRoute] RPC failed, trying next:', rpc)
    }
  }
  throw new Error('All Sepolia RPC endpoints failed')
}

/* Provider specifically for event log queries — avoids Alchemy free tier 10-block limit */
async function getLogsProvider() {
  const logRpcs = [
    'https://ethereum-sepolia-rpc.publicnode.com',  // no block range limit
    'https://sepolia.drpc.org',
    'https://1rpc.io/sepolia',
    process.env.SEPOLIA_RPC_URL,
    process.env.RPC_URL,  // Alchemy last — has 10-block limit on free tier
  ].filter(Boolean)

  for (const rpc of logRpcs) {
    if (rpc.includes('alchemy')) continue  // skip Alchemy for log queries
    try {
      const provider = new ethers.JsonRpcProvider(rpc)
      await provider.getBlockNumber()
      console.log('[SyncRoute] Using logs RPC:', rpc)
      return provider
    } catch {
      console.warn('[SyncRoute] Logs RPC failed:', rpc)
    }
  }
  /* Final fallback to Alchemy with chunked queries */
  console.warn('[SyncRoute] Falling back to Alchemy for logs (may be limited)')
  return new ethers.JsonRpcProvider(process.env.RPC_URL)
}

/* ══════════════════════════════════════════════════════════════════════
   POST /api/campaigns/sync-raised
   Admin-only: reads amountRaised from chain for all ETH campaigns,
   updates MongoDB, returns updated totals.
══════════════════════════════════════════════════════════════════════ */
router.post('/sync-raised', protect, adminOnly, async (req, res) => {
  try {
    const provider = await getWorkingProvider()

    /* Find all ETH campaigns (not fiat) with a real contract address */
    const campaigns = await Campaign.find({
      paymentType: { $ne: 'fiat' },
      contractAddress: { $regex: /^0x[0-9a-fA-F]{40}$/ },
    })

    let synced = 0
    let errors = 0
    const results = []

    await Promise.allSettled(
      campaigns.map(async (c) => {
        try {
          const contract     = new ethers.Contract(c.contractAddress, CAMPAIGN_ABI, provider)
          const [raised, claimed, paused] = await Promise.all([
            contract.amountRaised(),
            contract.claimed(),
            contract.paused(),
          ])

          const raisedEth = parseFloat(ethers.formatEther(raised))

          /* Count unique funders from Funded events */
          let funders = 0
          try {
            const filter = contract.filters.Funded()
            const events = await contract.queryFilter(filter, 0, 'latest')
            const unique = new Set(events.map(e => e.args.funder.toLowerCase()))
            funders = unique.size
          } catch (evErr) {
            console.warn('[SyncRoute] Could not read Funded events for', c.contractAddress)
          }

          const update = { amountRaised: raisedEth, claimed, paused }
          if (funders > 0) update.funders = funders

          await Campaign.findByIdAndUpdate(c._id, update)

          results.push({ id: c._id, title: c.title, amountRaised: raisedEth, funders })
          synced++
        } catch (err) {
          console.warn(`[SyncRoute] Failed for ${c.contractAddress}:`, err.message)
          errors++
        }
      })
    )

    const totalEth = results.reduce((s, r) => s + r.amountRaised, 0)

    res.json({
      success: true,
      message: `Synced ${synced} campaigns. ${errors} failed.`,
      synced,
      errors,
      totalEthRaised: totalEth.toFixed(6),
      campaigns: results,
    })
  } catch (err) {
    console.error('[SyncRoute] sync-raised error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   POST /api/campaigns/sync-funders
   Admin-only: reads all historical Funded events from chain and updates
   funders count + amountRaised for all ETH campaigns.
   Use this after deploying contractListener.js to backfill existing data.
══════════════════════════════════════════════════════════════════════ */
router.post('/sync-funders', protect, adminOnly, async (req, res) => {
  try {
    const provider = await getLogsProvider()

    const CAMPAIGN_ABI_EVENTS = [
      {
        type: 'event', name: 'Funded',
        inputs: [
          { type: 'address', name: 'funder', indexed: true },
          { type: 'uint256', name: 'amount', indexed: false },
        ],
      },
    ]

    const campaigns = await Campaign.find({
      paymentType:     { $ne: 'fiat' },
      contractAddress: { $regex: /^0x[0-9a-fA-F]{40}$/ },
    })

    let synced = 0
    let errors = 0
    const results = []

    /* Get current block to use as upper bound */
    const latestBlock = await provider.getBlockNumber()
    /* Sepolia Funded event topic hash */
    const fundedTopic = ethers.id('Funded(address,uint256)')

    await Promise.allSettled(campaigns.map(async (c) => {
      try {
        const contract = new ethers.Contract(c.contractAddress, CAMPAIGN_ABI_EVENTS, provider)

        /* Try queryFilter first — may fail on some RPCs with block 0 */
        let allFunded = []
        try {
          allFunded = await contract.queryFilter('Funded', 0, latestBlock)
        } catch (qfErr) {
          console.warn(`[SyncFunders] queryFilter failed for ${c.contractAddress}, trying getLogs:`, qfErr.message)
          /* Fallback: use provider.getLogs directly */
          const logs = await provider.getLogs({
            address:   c.contractAddress,
            topics:    [fundedTopic],
            fromBlock: 0,
            toBlock:   latestBlock,
          })
          allFunded = logs.map(log => {
            const parsed = contract.interface.parseLog(log)
            return { args: parsed.args }
          }).filter(Boolean)
        }

        const uniqueFunders = new Set(allFunded.map(e => e.args.funder.toLowerCase()))
        const totalRaised   = allFunded.reduce(
          (s, e) => s + parseFloat(ethers.formatEther(e.args.amount)), 0
        )

        console.log(`[SyncFunders] "${c.title}" — found ${allFunded.length} Funded events, ${uniqueFunders.size} unique funders`)

        /* Always update funders; only update amountRaised if events found */
        const update = { funders: uniqueFunders.size }
        if (allFunded.length > 0) {
          update.amountRaised = totalRaised
          update.raised       = totalRaised
        }

        await Campaign.findByIdAndUpdate(c._id, { $set: update })

        results.push({
          title:   c.title,
          funders: uniqueFunders.size,
          raised:  totalRaised,
          events:  allFunded.length,
        })
        synced++
      } catch (err) {
        console.warn(`[SyncFunders] Failed for ${c.contractAddress}:`, err.message)
        errors++
      }
    }))

    res.json({
      success: true,
      message: `Synced funders for ${synced} campaigns. ${errors} failed.`,
      campaigns: results,
    })
  } catch (err) {
    console.error('[SyncFunders] error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   POST /api/campaigns/set-funders
   Quick fix: manually set funders count for a specific campaign.
   Body: { contractAddress, funders }
══════════════════════════════════════════════════════════════════════ */
router.post('/set-funders', protect, adminOnly, async (req, res) => {
  try {
    const { contractAddress, funders } = req.body
    if (!contractAddress || funders === undefined)
      return res.status(400).json({ message: 'contractAddress and funders required' })

    const campaign = await Campaign.findOneAndUpdate(
      { contractAddress },
      { $set: { funders: Number(funders) } },
      { new: true }
    )
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' })

    res.json({ success: true, message: `funders set to ${funders}`, campaign })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   GET /api/campaigns/stats
   Returns pre-calculated stats including live ETH raised from MongoDB
   (after a sync has been done).
   Used by AdminDashboard to show correct totals.
══════════════════════════════════════════════════════════════════════ */
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const campaigns = await Campaign.find({})

    const ethCampaigns  = campaigns.filter(c => c.paymentType !== 'fiat')
    const fiatCampaigns = campaigns.filter(c => c.paymentType === 'fiat')

    const totalEthRaised = ethCampaigns.reduce((s, c) => s + parseFloat(c.amountRaised || 0), 0)
    const totalInrRaised = fiatCampaigns.reduce((s, c) => s + parseFloat(c.amountRaised || c.raised || 0), 0)
    const activeCamps    = campaigns.filter(c => !c.paused && c.deadline > Math.floor(Date.now()/1000)).length
    const funded         = campaigns.filter(c => parseFloat(c.amountRaised||0) >= parseFloat(c.goal||1)).length

    res.json({
      success: true,
      stats: {
        total:         campaigns.length,
        active:        activeCamps,
        funded,
        totalEthRaised: totalEthRaised.toFixed(6),
        totalInrRaised: totalInrRaised.toFixed(2),
        ethCampaigns:  ethCampaigns.length,
        fiatCampaigns: fiatCampaigns.length,
      }
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
