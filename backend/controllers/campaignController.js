import mongoose from 'mongoose'
import Campaign from '../models/Campaign.js'
import User     from '../models/User.js'
import { notifyAdminNewCampaign } from '../services/notificationService.js'

export const getAllCampaigns = async (req, res) => {
  try {
    const { category, owner, paused, paymentType } = req.query
    const filter = {}
    if (category)    filter.category    = category
    if (owner)       filter.owner       = owner.toLowerCase()
    if (paymentType) filter.paymentType = paymentType
    if (paused !== undefined) filter.paused = paused === 'true'

    const campaigns = await Campaign.find(filter).sort({ createdAt: -1 })
    res.json(campaigns)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const getCampaign = async (req, res) => {
  try {
    const { address } = req.params

    // Build query: always search by contractAddress.
    // Also search by _id if the param looks like a valid MongoDB ObjectId —
    // this covers fiat campaigns whose contractAddress is a fake placeholder
    // but whose detail page URL contains the MongoDB _id.
    const orConditions = [
      { contractAddress: address.toLowerCase() },
    ]

    if (mongoose.Types.ObjectId.isValid(address)) {
      orConditions.push({ _id: address })
    }

    const campaign = await Campaign.findOne({ $or: orConditions })

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' })
    res.json(campaign)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const createCampaign = async (req, res) => {
  try {
    const {
      contractAddress, factoryIndex, owner, ownerName,
      ownerUsername, ownerEmail, ownerPhone,
      title, description, imageHash,
      category, goal, deadline, txHash,
      paymentType,   // 'eth' | 'fiat'
    } = req.body

    const exists = await Campaign.findOne({
      contractAddress: contractAddress.toLowerCase(),
    })
    if (exists) return res.status(409).json({ message: 'Campaign already exists' })

    const campaign = await Campaign.create({
      contractAddress:    contractAddress.toLowerCase(),
      factoryIndex,
      owner:              owner.toLowerCase(),
      ownerName:          ownerName     || '',
      ownerUsername:      ownerUsername || '',
      title,
      description,
      imageHash,
      category,
      goal,
      deadline,
      txHash,
      paymentType:        paymentType === 'fiat' ? 'fiat' : 'eth',
      verificationStatus: 'pending',
    })

    // ── Notify admin about new pending campaign ───────────────────────────────
    try {
      const orConditions = []
      if (owner && owner !== 'unknown') {
        orConditions.push({ walletAddress: owner.toLowerCase() })
      }
      if (ownerUsername) {
        orConditions.push({ username: ownerUsername.toLowerCase() })
      }
      if (ownerEmail) {
        orConditions.push({ email: ownerEmail.toLowerCase() })
      }

      let creator = null
      if (orConditions.length > 0) {
        creator = await User.findOne({ $or: orConditions }).lean()
      }

      await notifyAdminNewCampaign({
        campaign,
        creator: creator
          ? {
              name:  creator.name  || creator.username || ownerName || owner,
              email: creator.email || ownerEmail || '',
              phone: creator.phone || ownerPhone || '',
            }
          : {
              name:  ownerName  || owner,
              email: ownerEmail || '',
              phone: ownerPhone || '',
            },
      })
    } catch (notifyErr) {
      console.warn('[createCampaign] Admin notification failed:', notifyErr.message)
    }

    res.status(201).json(campaign)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { contractAddress: req.params.address.toLowerCase() },
      req.body,
      { new: true }
    )
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' })
    res.json(campaign)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const getMyCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      owner: req.params.address.toLowerCase(),
    }).sort({ createdAt: -1 })
    res.json(campaigns)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const syncCampaign = async (req, res) => {
  try {
    const { address } = req.params
    const { amountRaised, claimed, paused, funders } = req.body

    const campaign = await Campaign.findOneAndUpdate(
      { contractAddress: address.toLowerCase() },
      { amountRaised, claimed, paused, funders },
      { new: true }
    )
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' })
    res.json(campaign)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
