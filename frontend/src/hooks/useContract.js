import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../context/WalletContext'
import { CAMPAIGN_ABI, FACTORY_ABI, CONTRACT_ADDRESS } from '../utils/constants'

export const useFactoryContract = () => {
  const { signer } = useWallet()
  const [contract, setContract] = useState(null)

  useEffect(() => {
    if (!signer || !CONTRACT_ADDRESS || !ethers.isAddress(CONTRACT_ADDRESS)) {
      setContract(null)
      return
    }
    try {
      setContract(new ethers.Contract(CONTRACT_ADDRESS, FACTORY_ABI, signer))
    } catch (err) {
      console.error('Factory contract error:', err)
      setContract(null)
    }
  }, [signer])

  return contract
}

export const useCampaignContract = (address) => {
  const { signer } = useWallet()
  const [contract, setContract] = useState(null)

  useEffect(() => {
    if (!address || !ethers.isAddress(address) || !signer) {
      setContract(null)
      return
    }
    try {
      setContract(new ethers.Contract(address, CAMPAIGN_ABI, signer))
    } catch (err) {
      console.error('Campaign contract error:', err)
      setContract(null)
    }
  }, [address, signer])

  const getCleanEth = (raw) => {
    if (raw === null || raw === undefined)
      throw new Error('ETH amount is required')
    if (typeof raw === 'object')
      throw new Error('Invalid ETH amount — received object instead of string')
    const str = String(raw).trim()
    if (!str || str === '0')
      throw new Error('ETH amount must be greater than 0')
    const num = parseFloat(str)
    if (isNaN(num) || num <= 0)
      throw new Error(`Invalid ETH amount: "${str}"`)
    return str
  }

  // ✅ Calls contract.fund() — matching your Solidity function name
  const donate = async (amountInEth) => {
    if (!contract) throw new Error('Contract not initialized — connect your wallet')
    const clean    = getCleanEth(amountInEth)
    const weiValue = ethers.parseEther(clean)
    const tx = await contract.fund({ value: weiValue })
    await tx.wait()
    return tx
  }

  // ✅ Matches Solidity: setPaused(bool)
  const pauseCampaign = async () => {
    if (!contract) throw new Error('Contract not initialized')
    const tx = await contract.setPaused(true)
    await tx.wait()
    return tx
  }

  const resumeCampaign = async () => {
    if (!contract) throw new Error('Contract not initialized')
    const tx = await contract.setPaused(false)
    await tx.wait()
    return tx
  }

  // ✅ Matches Solidity: withdraw()
  const claimFunds = async () => {
    if (!contract) throw new Error('Contract not initialized')
    const tx = await contract.withdraw()
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
      goal         : ethers.formatEther(goal),
      amountRaised : ethers.formatEther(amountRaised),
      deadline     : Number(deadline),
      claimed,
      paused,
    }
  }

  return { contract, donate, pauseCampaign, resumeCampaign, claimFunds, refund, getCampaignDetails }
}
