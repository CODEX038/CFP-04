import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../context/WalletContext'
import { CONTRACT_ADDRESS, FACTORY_ABI, CAMPAIGN_ABI } from '../utils/constants'
import axios from 'axios'

export const useCampaigns = () => {
  const { provider } = useWallet()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Try backend first
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/campaigns`
      )

      if (data.length > 0 && provider) {
        // Sync live on-chain data
        const enriched = await Promise.all(
          data.map(async (c) => {
            try {
              if (!ethers.isAddress(c.contractAddress)) return c
              const contract = new ethers.Contract(
                c.contractAddress, CAMPAIGN_ABI, provider
              )
              const [amountRaised, claimed, paused] = await Promise.all([
                contract.amountRaised(),
                contract.claimed(),
                contract.paused(),
              ])
              return {
                ...c,
                amountRaised: ethers.formatEther(amountRaised),
                claimed,
                paused,
                deadline: c.deadline * 1000,
              }
            } catch {
              return { ...c, deadline: c.deadline * 1000 }
            }
          })
        )
        setCampaigns(enriched)
      } else if (provider && CONTRACT_ADDRESS) {
        // Fallback: fetch from contract directly
        const factory  = new ethers.Contract(CONTRACT_ADDRESS, FACTORY_ABI, provider)
        const raw      = await factory.getCampaigns()
        const enriched = await Promise.all(
          raw.map(async (c) => {
            try {
              const contract = new ethers.Contract(c.campaignAddress, CAMPAIGN_ABI, provider)
              const [amountRaised, claimed, paused] = await Promise.all([
                contract.amountRaised(),
                contract.claimed(),
                contract.paused(),
              ])
              return {
                id:              Number(c.index),
                contractAddress: c.campaignAddress,
                owner:           c.owner,
                title:           c.title,
                description:     c.description,
                imageHash:       c.imageHash,
                goal:            ethers.formatEther(c.goal),
                amountRaised:    ethers.formatEther(amountRaised),
                deadline:        Number(c.deadline) * 1000,
                claimed,
                paused,
              }
            } catch { return null }
          })
        )
        setCampaigns(enriched.filter(Boolean))
      } else {
        setCampaigns(data.map(c => ({ ...c, deadline: c.deadline * 1000 })))
      }
    } catch (err) {
      console.error('fetchCampaigns error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  return { campaigns, loading, error, refetch: fetchCampaigns }
}

export const useCampaign = (contractAddress) => {
  const { provider } = useWallet()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const fetchCampaign = useCallback(async () => {
    if (!contractAddress) return
    if (!ethers.isAddress(contractAddress)) {
      setError(`Invalid contract address: "${contractAddress}"`)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Try backend first
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/campaigns/${contractAddress}`
        )
        if (data && provider) {
          const contract = new ethers.Contract(contractAddress, CAMPAIGN_ABI, provider)
          const [amountRaised, claimed, paused] = await Promise.all([
            contract.amountRaised(),
            contract.claimed(),
            contract.paused(),
          ])
          setCampaign({
            ...data,
            amountRaised: ethers.formatEther(amountRaised),
            claimed,
            paused,
            deadline: data.deadline * 1000,
          })
          return
        }
      } catch { }

      // Fallback: fetch from contract
      if (!provider) return
      const contract = new ethers.Contract(contractAddress, CAMPAIGN_ABI, provider)
      const [owner, title, description, imageHash, goal, deadline, amountRaised, claimed, paused] =
        await Promise.all([
          contract.owner(), contract.title(), contract.description(),
          contract.imageHash(), contract.goal(), contract.deadline(),
          contract.amountRaised(), contract.claimed(), contract.paused(),
        ])
      setCampaign({
        contractAddress,
        owner, title, description, imageHash,
        goal:         ethers.formatEther(goal),
        deadline:     Number(deadline) * 1000,
        amountRaised: ethers.formatEther(amountRaised),
        claimed,
        paused,
      })
    } catch (err) {
      console.error('fetchCampaign error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [provider, contractAddress])

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

  return { campaign, loading, error, refetch: fetchCampaign }
}