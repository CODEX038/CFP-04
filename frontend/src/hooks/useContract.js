import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../context/WalletContext'
import { CAMPAIGN_ABI, FACTORY_ABI, CONTRACT_ADDRESS } from '../utils/constants'

// ── Factory Contract Hook ─────────────────────────────────────────────────────
export const useFactoryContract = () => {
  const { provider, signer } = useWallet()
  const [contract, setContract] = useState(null)

  useEffect(() => {
    if (!signer || !CONTRACT_ADDRESS || !ethers.isAddress(CONTRACT_ADDRESS)) {
      setContract(null)
      return
    }

    try {
      const factoryContract = new ethers.Contract(CONTRACT_ADDRESS, FACTORY_ABI, signer)
      setContract(factoryContract)
    } catch (error) {
      console.error('Error creating factory contract:', error)
      setContract(null)
    }
  }, [signer])

  return contract
}

// ── Campaign Contract Hook ────────────────────────────────────────────────────
export const useCampaignContract = (address) => {
  const { provider, signer } = useWallet()
  const [contract, setContract] = useState(null)

  useEffect(() => {
    // Guard: invalid or fiat campaign address
    if (!address || !ethers.isAddress(address)) {
      setContract(null)
      return
    }

    if (!signer) {
      setContract(null)
      return
    }

    try {
      const campaignContract = new ethers.Contract(address, CAMPAIGN_ABI, signer)
      setContract(campaignContract)
    } catch (error) {
      console.error('Error creating campaign contract:', error)
      setContract(null)
    }
  }, [address, signer])

  // ── Contract Methods ────────────────────────────────────────────────────────

  const donate = async (amountInEth) => {
    if (!contract) throw new Error('Contract not initialized')
    const tx = await contract.donate({
      value: ethers.parseEther(amountInEth.toString()),
    })
    await tx.wait()
    return tx
  }

  const pauseCampaign = async () => {
    if (!contract) throw new Error('Contract not initialized')
    const tx = await contract.pause()
    await tx.wait()
    return tx
  }

  const resumeCampaign = async () => {
    if (!contract) throw new Error('Contract not initialized')
    const tx = await contract.resume()
    await tx.wait()
    return tx
  }

  const claimFunds = async () => {
    if (!contract) throw new Error('Contract not initialized')
    const tx = await contract.claim()
    await tx.wait()
    return tx
  }

  const refund = async () => {
    if (!contract) throw new Error('Contract not initialized')
    const tx = await contract.refund()
    await tx.wait()
    return tx
  }

  const getCampaignDetails = async () => {
    if (!contract) throw new Error('Contract not initialized')
    
    const [owner, goal, amountRaised, deadline, claimed, paused] = await Promise.all([
      contract.owner(),
      contract.goal(),
      contract.amountRaised(),
      contract.deadline(),
      contract.claimed(),
      contract.paused(),
    ])

    return {
      owner,
      goal: ethers.formatEther(goal),
      amountRaised: ethers.formatEther(amountRaised),
      deadline: Number(deadline),
      claimed,
      paused,
    }
  }

  return {
    contract,
    donate,
    pauseCampaign,
    resumeCampaign,
    claimFunds,
    refund,
    getCampaignDetails,
  }
}