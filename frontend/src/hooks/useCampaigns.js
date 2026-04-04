import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../context/WalletContext'
import { CONTRACT_ADDRESS, FACTORY_ABI, CAMPAIGN_ABI } from '../utils/constants'
import axios from 'axios'

// FIX: single source of truth for API base — always includes /api
const API = `${import.meta.env.VITE_API_URL}/api`

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
      const response = await axios.get(`${API}/campaigns`)  // ✅ was missing /api

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.data || []

      if (data.length > 0) {
        const enriched = await Promise.all(
          data.map(async (c) => {

            if (!isOnChain(c)) {
              try {
                const id     = c._id || c.contractAddress || c.id
                const detail = await axios.get(`${API}/campaigns/${id}`)  // ✅ fixed
                const fresh  = detail.data.data || detail.data
                return {
                  ...c,
                  ...fresh,
                  amountRaised : fresh.amountRaised ?? c.amountRaised ?? 0,
                  funders      : fresh.funders      ?? c.funders      ?? 0,
                  deadline     : (fresh.deadline    ?? c.deadline) * 1000,
                }
              } catch {
                return {
                  ...c,
                  amountRaised : c.amountRaised ?? 0,
                  funders      : c.funders      ?? 0,
                  deadline     : c.deadline * 1000,
                }
              }
            }

            if (!provider) {
              return { ...c, deadline: c.deadline * 1000 }
            }

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
                amountRaised : ethers.formatEther(amountRaised),
                claimed,
                paused,
                deadline     : c.deadline * 1000,
              }
            } catch {
              return { ...c, deadline: c.deadline * 1000 }
            }
          })
        )
        setCampaigns(enriched)

      } else if (provider && CONTRACT_ADDRESS) {
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
                id              : Number(c.index),
                contractAddress : c.campaignAddress,
                owner           : c.owner,
                title           : c.title,
                description     : c.description,
                imageHash       : c.imageHash,
                goal            : ethers.formatEther(c.goal),
                amountRaised    : ethers.formatEther(amountRaised),
                deadline        : Number(c.deadline) * 1000,
                claimed,
                paused,
                paymentType     : 'eth',
              }
            } catch { return null }
          })
        )
        setCampaigns(enriched.filter(Boolean))

      } else {
        setCampaigns(
          data.map(c => ({
            ...c,
            amountRaised : c.amountRaised ?? 0,
            funders      : c.funders      ?? 0,
            deadline     : c.deadline * 1000,
          }))
        )
      }
    } catch (err) {
      console.error('fetchCampaigns error:', err)
      setError(err.message)
      setCampaigns([])
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
      const response = await axios.get(`${API}/campaigns/${contractAddress}`)  // ✅ fixed

      const data = response.data.data || response.data

      if (!data) {
        setError('Campaign not found.')
        return
      }

      if (!isOnChain(data)) {
        setCampaign({
          ...data,
          amountRaised : data.amountRaised ?? 0,
          funders      : data.funders      ?? 0,
          deadline     : data.deadline * 1000,
        })
        return
      }

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
            amountRaised : ethers.formatEther(amountRaised),
            claimed,
            paused,
            deadline     : data.deadline * 1000,
          })
          return
        } catch (chainErr) {
          console.warn('On-chain sync failed, using DB data:', chainErr.message)
        }
      }

      setCampaign({
        ...data,
        amountRaised : data.amountRaised ?? 0,
        funders      : data.funders      ?? 0,
        deadline     : data.deadline * 1000,
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