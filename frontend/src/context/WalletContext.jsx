import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { SUPPORTED_CHAIN_ID } from '../utils/constants'

const WalletContext = createContext(null)

export const WalletProvider = ({ children }) => {
  const [account, setAccount]           = useState(null)
  const [provider, setProvider]         = useState(null)
  const [signer, setSigner]             = useState(null)
  const [chainId, setChainId]           = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError]               = useState(null)
  const [wrongNetwork, setWrongNetwork] = useState(false)

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask not found. Please install it.')
      return
    }
    try {
      setIsConnecting(true)
      setError(null)
      const _provider = new ethers.BrowserProvider(window.ethereum)
      await _provider.send('eth_requestAccounts', [])
      const _signer  = await _provider.getSigner()
      const _account = await _signer.getAddress()
      const network  = await _provider.getNetwork()
      const _chainId = Number(network.chainId)

      setProvider(_provider)
      setSigner(_signer)
      setAccount(_account)
      setChainId(_chainId)
      setWrongNetwork(_chainId !== SUPPORTED_CHAIN_ID)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setChainId(null)
    setWrongNetwork(false)
    setError(null)
  }, [])

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return
    try {
      // Try switching to Sepolia
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],  // 11155111 in hex
      })
    } catch (err) {
      if (err.code === 4902) {
        // Sepolia not added to MetaMask yet — add it
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId:         '0xaa36a7',
              chainName:       'Sepolia Test Network',
              nativeCurrency:  { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
              rpcUrls:         ['https://rpc.sepolia.org', 'https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          })
        } catch (addErr) {
          setError(addErr.message)
        }
      } else {
        setError(err.message)
      }
    }
  }, [])

  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) disconnectWallet()
      else setAccount(accounts[0])
    }

    const handleChainChanged = (chainIdHex) => {
      const newChainId = parseInt(chainIdHex, 16)
      setChainId(newChainId)
      setWrongNetwork(newChainId !== SUPPORTED_CHAIN_ID)
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts.length > 0) connectWallet()
    })

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [connectWallet, disconnectWallet])

  return (
    <WalletContext.Provider value={{
      account,
      provider,
      signer,
      chainId,
      isConnecting,
      error,
      wrongNetwork,
      connectWallet,
      disconnectWallet,
      switchNetwork,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider')
  return ctx
}
