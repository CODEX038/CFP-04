/**
 * contractListener.js
 * Listens to Sepolia blockchain events and syncs campaign data in MongoDB.
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
]

// Returns true if the contractAddress is a real on-chain address (not a fiat pseudo-address)
const isRealAddress = (addr) =>
  addr &&
  !addr.startsWith('0xfiat_') &&
  /^0x[0-9a-fA-F]{40}$/.test(addr)

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

    // ── CampaignCreated — update txHash when on-chain event fires ────────────
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
          await Campaign.findOneAndUpdate(
            { title, isActive: true },
            { $set: { txHash: event?.log?.transactionHash || '' } }
          )
        }
      } catch (err) {
        console.error('CampaignCreated update error:', err.message)
      }
    })

    // ── Attach Funded/Withdrawn/Refunded listeners to ETH campaigns only ─────
    const attachCampaignListeners = async () => {
      // Only fetch ETH campaigns — fiat campaigns have no real contract to listen to
      const campaigns = await Campaign.find({
        isActive:    true,
        paymentType: { $ne: 'fiat' },
      })

      // Extra safety: filter out any pseudo-addresses that slipped through
      const ethCampaigns = campaigns.filter(c => isRealAddress(c.contractAddress))

      console.log(`Attaching listeners to ${ethCampaigns.length} campaign(s)...`)

      ethCampaigns.forEach((c) => {
        const contract = new ethers.Contract(c.contractAddress, CAMPAIGN_ABI, provider)

        // Funded — increment raised amount
        contract.on('Funded', async (funder, amount) => {
          const eth = parseFloat(ethers.formatEther(amount))
          console.log(`Funded: "${c.title}" +${eth} ETH from ${funder}`)
          try {
            await Campaign.findByIdAndUpdate(c._id, { $inc: { raised: eth } })
          } catch (err) {
            console.error('Funded listener error:', err.message)
          }
        })

        // Withdrawn — mark as claimed
        contract.on('Withdrawn', async (owner, amount) => {
          console.log(`Withdrawn: "${c.title}" ${ethers.formatEther(amount)} ETH`)
          try {
            await Campaign.findByIdAndUpdate(c._id, { $set: { claimed: true } })
          } catch (err) {
            console.error('Withdrawn listener error:', err.message)
          }
        })

        // Refunded — decrement raised amount
        contract.on('Refunded', async (funder, amount) => {
          const eth = parseFloat(ethers.formatEther(amount))
          console.log(`Refunded: "${c.title}" -${eth} ETH to ${funder}`)
          try {
            await Campaign.findByIdAndUpdate(c._id, { $inc: { raised: -eth } })
          } catch (err) {
            console.error('Refunded listener error:', err.message)
          }
        })
      })
    }

    await attachCampaignListeners()

    // Re-attach every 5 minutes to pick up newly created ETH campaigns
    setInterval(attachCampaignListeners, 5 * 60 * 1000)

  } catch (err) {
    console.error('Listener failed to start:', err.message)
  }
}
