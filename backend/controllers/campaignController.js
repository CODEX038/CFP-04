import Campaign from '../models/Campaign.js'

export const getAllCampaigns = async (req, res) => {
  try {
    const { category, owner, paused } = req.query
    const filter = {}
    if (category) filter.category = category
    if (owner)    filter.owner    = owner.toLowerCase()
    if (paused !== undefined) filter.paused = paused === 'true'

    const campaigns = await Campaign.find(filter).sort({ createdAt: -1 })
    res.json(campaigns)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      contractAddress: req.params.address.toLowerCase()
    })
    if (!campaign)
      return res.status(404).json({ message: 'Campaign not found' })
    res.json(campaign)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const createCampaign = async (req, res) => {
  try {
    const {
      contractAddress, factoryIndex, owner, ownerName,
      ownerUsername, title, description, imageHash,
      category, goal, deadline, txHash
    } = req.body

    const exists = await Campaign.findOne({
      contractAddress: contractAddress.toLowerCase()
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
      verificationStatus: 'pending',   // ← always start as pending
    })
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
    if (!campaign)
      return res.status(404).json({ message: 'Campaign not found' })
    res.json(campaign)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const getMyCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      owner: req.params.address.toLowerCase()
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
    if (!campaign)
      return res.status(404).json({ message: 'Campaign not found' })
    res.json(campaign)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
