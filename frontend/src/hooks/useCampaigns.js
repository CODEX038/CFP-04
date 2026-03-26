import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../context/WalletContext'
import { CONTRACT_ADDRESS, FACTORY_ABI, CAMPAIGN_ABI } from '../utils/constants'
import axios from 'axios'

// ── Helper: is this a real on-chain address? ──────────────────────────────────
const isOnChain = (c) =>
  c.paymentType !== 'fiat' && ethers.isAddress(c.contractAddress)

export const useCampaigns = () => {
  const { provider } = useWallet()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/campaigns`
      )

      if (data.length > 0 && provider) {
        const enriched = await Promise.all(
          data.map(async (c) => {
            // ── Fiat campaign: no on-chain data, use DB values as-is ──────────
            if (!isOnChain(c)) {
              return {
                ...c,
                deadline: c.deadline * 1000,
              }
            }

            // ── ETH campaign: sync live on-chain state ────────────────────────
            try {
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
        // Fallback: fetch ETH campaigns directly from factory contract
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
                paymentType:     'eth',
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

    setLoading(true)
    setError(null)
    try {
      // Always fetch from backend first — it has paymentType
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/campaigns/${contractAddress}`
      )

      if (!data) {
        setError('Campaign not found.')
        return
      }

      // ── Fiat campaign: no contract call needed ────────────────────────────
      if (!isOnChain(data)) {
        setCampaign({
          ...data,
          deadline: data.deadline * 1000,
        })
        return
      }

      // ── ETH campaign: validate address then sync on-chain ─────────────────
      if (!ethers.isAddress(data.contractAddress)) {
        setError(`Invalid contract address: "${data.contractAddress}"`)
        return
      }

      if (provider) {
        try {
          const contract = new ethers.Contract(data.contractAddress, CAMPAIGN_ABI, provider)
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
        } catch (chainErr) {
          console.warn('On-chain sync failed, using DB data:', chainErr.message)
        }
      }

      // Provider unavailable — use DB data only
      setCampaign({ ...data, deadline: data.deadline * 1000 })

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
