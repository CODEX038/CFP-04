/**
 * contractListener.js
 * Listens to Sepolia blockchain events and syncs campaign data in MongoDB.
 *
 * IMPORTANT: Campaigns are created in MongoDB by the frontend (POST /api/campaigns)
 * immediately after the on-chain transaction. This listener only UPDATES existing
 * records — it never creates new ones (which would fail due to required fields
 * like creator, category, description that are not available on-chain).
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
]

export const startListener = async () => {
  try {
    if (!process.env.RPC_URL || !process.env.CONTRACT_ADDRESS) {
      console.warn('RPC_URL or CONTRACT_ADDRESS missing — listener not started.')
      return
    }

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
    const factory  = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      FACTORY_ABI,
      provider
    )

    console.log('Contract listener started on Sepolia...')

    // ── CampaignCreated — update contractCampaignId and txHash if campaign ──
    // already saved to DB by the frontend. Skip silently if not found.
    factory.on('CampaignCreated', async (index, campaignAddress, owner, title, goal, deadline, event) => {
      console.log(`CampaignCreated event: "${title}" at ${campaignAddress}`)
      try {
        const updated = await Campaign.findOneAndUpdate(
          { contractCampaignId: Number(index) },
          {
            $set: {
              txHash:   event?.log?.transactionHash || '',
              isActive: true,
            }
          },
          { new: true }
        )
        if (!updated) {
          // Frontend may not have saved yet — try matching by title as fallback
          await Campaign.findOneAndUpdate(
            { title, isActive: true },
            {
              $set: {
                txHash:   event?.log?.transactionHash || '',
              }
            }
          )
        }
      } catch (err) {
        console.error('CampaignCreated update error:', err.message)
      }
    })

    // ── Attach Funded/Withdrawn/Refunded listeners to all known campaigns ─────
    const attachCampaignListeners = async () => {
      const campaigns = await Campaign.find({ isActive: true })
      console.log(`Attaching listeners to ${campaigns.length} campaign(s)...`)

      campaigns.forEach((c) => {
        // Need a contract address on-chain to listen — skip if not set
        // (contractCampaignId is the factory index; we need the actual contract address)
        // The frontend saves contractAddress in a separate field if you have it
        // For now we listen using the stored txHash lookup as fallback
        if (!c.contractAddress) return

        const contract = new ethers.Contract(c.contractAddress, CAMPAIGN_ABI, provider)

        // Funded — increment raised amount
        contract.on('Funded', async (funder, amount) => {
          const eth = parseFloat(ethers.formatEther(amount))
          console.log(`Funded: "${c.title}" +${eth} ETH from ${funder}`)
          try {
            await Campaign.findByIdAndUpdate(c._id, {
              $inc: { raised: eth },
            })
          } catch (err) {
            console.error('Funded listener error:', err.message)
          }
        })

        // Withdrawn — mark as claimed
        contract.on('Withdrawn', async (owner, amount) => {
          console.log(`Withdrawn: "${c.title}" ${ethers.formatEther(amount)} ETH`)
          try {
            await Campaign.findByIdAndUpdate(c._id, {
              $set: { claimed: true }
            })
          } catch (err) {
            console.error('Withdrawn listener error:', err.message)
          }
        })

        // Refunded — decrement raised amount
        contract.on('Refunded', async (funder, amount) => {
          const eth = parseFloat(ethers.formatEther(amount))
          console.log(`Refunded: "${c.title}" -${eth} ETH to ${funder}`)
          try {
            await Campaign.findByIdAndUpdate(c._id, {
              $inc: { raised: -eth },
            })
          } catch (err) {
            console.error('Refunded listener error:', err.message)
          }
        })
      })
    }

    await attachCampaignListeners()

    // Re-attach listeners every 5 minutes to pick up newly created campaigns
    setInterval(attachCampaignListeners, 5 * 60 * 1000)

  } catch (err) {
    console.error('Listener failed to start:', err.message)
  }
}
