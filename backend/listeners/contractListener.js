/**
 * contractListener.js
 * Listens to Sepolia blockchain events and syncs campaign data in MongoDB.
 *
 * Uses queryFilter polling instead of contract.on() to avoid Alchemy's
 * "block range extends beyond current head block" filter errors on free tier.
 *
 * Only attaches listeners to ETH campaigns (paymentType === 'eth').
 * Fiat campaigns use pseudo-addresses (0xfiat_...) which are not real contracts.
 */

import { ethers }  from 'ethers'
import dotenv      from 'dotenv'
import Campaign    from '../models/Campaign.js'

dotenv.config()

const FACTORY_ABI = [
  "event CampaignCreated(uint256 indexed index, address indexed campaignAddress, address indexed owner, string title, uint256 goal, uint256 deadline)",
]

const CAMPAIGN_ABI = [
  "event Funded(address indexed funder, uint256 amount)",
  "event Withdrawn(address indexed owner, uint256 amount)",
  "event Refunded(address indexed funder, uint256 amount)",
  /* Legacy event names — keep for compatibility */
  "event RefundIssued(address indexed donor, uint256 amount)",
]

const POLL_INTERVAL_MS  = 30 * 1000   // poll every 30 seconds
const BLOCK_LOOK_BEHIND = 50          // only look back 50 blocks per poll (safe for Alchemy free tier)

const isRealAddress = (addr) =>
  addr &&
  !addr.startsWith('0xfiat_') &&
  /^0x[0-9a-fA-F]{40}$/.test(addr)

// Track last processed block per contract address to avoid double-processing
const lastBlock = {}

export const startListener = async () => {
  try {
    if (!process.env.RPC_URL || !process.env.CONTRACT_ADDRESS) {
      console.warn('RPC_URL or CONTRACT_ADDRESS missing — listener not started.')
      return
    }

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
    const factory  = new ethers.Contract(process.env.CONTRACT_ADDRESS, FACTORY_ABI, provider)

    console.log('Contract listener started on Sepolia (polling mode)...')

    // ── Poll factory for CampaignCreated events ───────────────────────────────
    const pollFactory = async () => {
      try {
        const latest = await provider.getBlockNumber()
        const key    = 'factory'
        const from   = lastBlock[key] ? lastBlock[key] + 1 : latest - BLOCK_LOOK_BEHIND

        if (from > latest) return

        const events = await factory.queryFilter('CampaignCreated', from, latest)

        for (const event of events) {
          const [index, campaignAddress, , title] = event.args
          console.log(`CampaignCreated event: "${title}" at ${campaignAddress}`)
          try {
            const updated = await Campaign.findOneAndUpdate(
              { contractCampaignId: Number(index) },
              { $set: { txHash: event.transactionHash || '', isActive: true } },
              { new: true }
            )
            if (!updated) {
              await Campaign.findOneAndUpdate(
                { title, isActive: true },
                { $set: { txHash: event.transactionHash || '' } }
              )
            }
          } catch (err) {
            console.error('CampaignCreated update error:', err.message)
          }
        }

        lastBlock[key] = latest
      } catch (err) {
        console.error('Factory poll error:', err.shortMessage || err.message)
      }
    }

    // ── Poll individual campaign contracts ────────────────────────────────────
    const pollCampaigns = async () => {
      try {
        const campaigns = await Campaign.find({
          isActive:    true,
          paymentType: { $ne: 'fiat' },
        })

        const ethCampaigns = campaigns.filter(c => isRealAddress(c.contractAddress))
        const latest       = await provider.getBlockNumber()

        for (const c of ethCampaigns) {
          const key      = c.contractAddress.toLowerCase()
          const from     = lastBlock[key] ? lastBlock[key] + 1 : latest - BLOCK_LOOK_BEHIND

          if (from > latest) continue

          const contract = new ethers.Contract(c.contractAddress, CAMPAIGN_ABI, provider)

          try {
            const [fundedEvents, withdrawnEvents, refundedEvents] = await Promise.all([
              contract.queryFilter('Funded',    from, latest),
              contract.queryFilter('Withdrawn', from, latest),
              /* Try both event names for refunds */
              contract.queryFilter('Refunded',  from, latest).catch(() => []),
            ])

            /* ── Funded: increment amountRaised AND funders ── */
            for (const event of fundedEvents) {
              const eth    = parseFloat(ethers.formatEther(event.args.amount))
              const funder = event.args.funder
              console.log(`Funded: "${c.title}" +${eth} ETH from ${funder}`)

              await Campaign.findByIdAndUpdate(c._id, {
                $inc: {
                  amountRaised: eth,   // ✅ correct field name (was 'raised')
                  raised:       eth,   // also update legacy field
                  funders:      1,     // ✅ increment donor count
                },
              })
            }

            /* ── Withdrawn: mark as claimed ── */
            for (const event of withdrawnEvents) {
              console.log(`Withdrawn: "${c.title}" ${ethers.formatEther(event.args.amount)} ETH`)
              await Campaign.findByIdAndUpdate(c._id, {
                $set: { claimed: true },
              })
            }

            /* ── Refunded: decrement amountRaised ── */
            for (const event of refundedEvents) {
              const eth = parseFloat(ethers.formatEther(event.args.amount))
              console.log(`Refunded: "${c.title}" -${eth} ETH to ${event.args.funder}`)
              await Campaign.findByIdAndUpdate(c._id, {
                $inc: {
                  amountRaised: -eth,
                  raised:       -eth,
                  funders:      -1,
                },
              })
            }

            /* ── Also try legacy RefundIssued event name ── */
            try {
              const refundIssuedEvents = await contract.queryFilter('RefundIssued', from, latest)
              for (const event of refundIssuedEvents) {
                const eth = parseFloat(ethers.formatEther(event.args.amount))
                console.log(`RefundIssued: "${c.title}" -${eth} ETH`)
                await Campaign.findByIdAndUpdate(c._id, {
                  $inc: {
                    amountRaised: -eth,
                    raised:       -eth,
                    funders:      -1,
                  },
                })
              }
            } catch {
              /* RefundIssued event not in this contract — skip */
            }

            lastBlock[key] = latest
          } catch (err) {
            console.error(`Poll error for campaign "${c.title}":`, err.shortMessage || err.message)
          }
        }
      } catch (err) {
        console.error('Campaign poll error:', err.shortMessage || err.message)
      }
    }

    // ── Start polling ─────────────────────────────────────────────────────────
    await pollFactory()
    await pollCampaigns()

    setInterval(pollFactory,   POLL_INTERVAL_MS)
    setInterval(pollCampaigns, POLL_INTERVAL_MS)

  } catch (err) {
    console.error('Listener failed to start:', err.message)
  }
}
