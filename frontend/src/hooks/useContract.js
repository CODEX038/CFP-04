import { useMemo } from 'react'
import { ethers }  from 'ethers'
import { useWallet } from '../context/WalletContext'
import { CONTRACT_ADDRESS, FACTORY_ABI, CAMPAIGN_ABI } from '../utils/constants'

export const useFactory = (withSigner = false) => {
  const { signer, provider } = useWallet()
  return useMemo(() => {
    const runner = withSigner ? signer : provider
    if (!runner || !CONTRACT_ADDRESS) return null
    return new ethers.Contract(CONTRACT_ADDRESS, FACTORY_ABI, runner)
  }, [signer, provider, withSigner])
}

export const useCampaignContract = (address, withSigner = false) => {
  const { signer, provider } = useWallet()
  return useMemo(() => {
    const runner = withSigner ? signer : provider
    if (!runner || !address) return null

    // ── Never create a contract for fiat pseudo-addresses ─────────────────────
    // Fiat campaign addresses start with '0xfiat_' — they are not real contracts
    if (!ethers.isAddress(address)) return null

    return new ethers.Contract(address, CAMPAIGN_ABI, runner)
  }, [signer, provider, address, withSigner])
}
