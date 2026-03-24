import axios from 'axios'

const PINATA_API = 'https://api.pinata.cloud'

export const useIPFS = () => {
  const apiKey    = import.meta.env.VITE_PINATA_API_KEY
  const apiSecret = import.meta.env.VITE_PINATA_SECRET

  const uploadImage = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await axios.post(`${PINATA_API}/pinning/pinFileToIPFS`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
    })
    return res.data.IpfsHash
  }

  const uploadMetadata = async (metadata) => {
    const res = await axios.post(
      `${PINATA_API}/pinning/pinJSONToIPFS`,
      { pinataContent: metadata },
      {
        headers: {
          pinata_api_key: apiKey,
          pinata_secret_api_key: apiSecret,
        },
      }
    )
    return res.data.IpfsHash
  }

  const getImageUrl = (hash) =>
    hash ? `https://gateway.pinata.cloud/ipfs/${hash}` : null

  return { uploadImage, uploadMetadata, getImageUrl }
}