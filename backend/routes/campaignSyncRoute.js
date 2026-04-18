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
]

function getProvider() {
  /* Fallback chain: env var → publicnode → ankr → official */
  const rpc = process.env.SEPOLIA_RPC_URL
    || 'https://rpc2.sepolia.org'
  return new ethers.JsonRpcProvider(rpc)
}

async function getWorkingProvider() {
  const rpcs = [
    process.env.RPC_URL,             // Alchemy — already used by contractListener
    process.env.SEPOLIA_RPC_URL,     // fallback from env
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://sepolia.drpc.org',
    'https://1rpc.io/sepolia',
  ].filter(Boolean)

  for (const rpc of rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc)
      await provider.getBlockNumber()   // quick connectivity check
      console.log('[SyncRoute] Using RPC:', rpc)
      return provider
    } catch {
      console.warn('[SyncRoute] RPC failed, trying next:', rpc)
    }
  }
  throw new Error('All Sepolia RPC endpoints failed')
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

          await Campaign.findByIdAndUpdate(c._id, {
            amountRaised: raisedEth,
            claimed,
            paused,
          })

          results.push({ id: c._id, title: c.title, amountRaised: raisedEth })
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
