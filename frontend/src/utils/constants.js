export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS

export const SUPPORTED_CHAIN_ID = 11155111  // Sepolia

export const FACTORY_ABI = [
  {
    "type": "function",
    "name": "createCampaign",
    "inputs": [
      { "name": "_title",       "type": "string"  },
      { "name": "_description", "type": "string"  },
      { "name": "_imageHash",   "type": "string"  },
      { "name": "_goal",        "type": "uint256" },
      { "name": "_deadline",    "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getCampaigns",
    "inputs": [],
    "outputs": [{
      "name": "",
      "type": "tuple[]",
      "components": [
        { "name": "campaignAddress", "type": "address" },
        { "name": "owner",           "type": "address" },
        { "name": "title",           "type": "string"  },
        { "name": "description",     "type": "string"  },
        { "name": "imageHash",       "type": "string"  },
        { "name": "goal",            "type": "uint256" },
        { "name": "deadline",        "type": "uint256" },
        { "name": "index",           "type": "uint256" }
      ]
    }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCampaign",
    "inputs": [{ "name": "index", "type": "uint256" }],
    "outputs": [{
      "name": "",
      "type": "tuple",
      "components": [
        { "name": "campaignAddress", "type": "address" },
        { "name": "owner",           "type": "address" },
        { "name": "title",           "type": "string"  },
        { "name": "description",     "type": "string"  },
        { "name": "imageHash",       "type": "string"  },
        { "name": "goal",            "type": "uint256" },
        { "name": "deadline",        "type": "uint256" },
        { "name": "index",           "type": "uint256" }
      ]
    }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "adminPauseCampaign",
    "inputs": [
      { "name": "index",   "type": "uint256" },
      { "name": "_paused", "type": "bool"    }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "campaignCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "admin",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "CampaignCreated",
    "inputs": [
      { "name": "index",           "type": "uint256", "indexed": true  },
      { "name": "campaignAddress", "type": "address", "indexed": true  },
      { "name": "owner",           "type": "address", "indexed": true  },
      { "name": "title",           "type": "string",  "indexed": false },
      { "name": "goal",            "type": "uint256", "indexed": false },
      { "name": "deadline",        "type": "uint256", "indexed": false }
    ]
  }
]

export const CAMPAIGN_ABI = [
  {
    "type": "function",
    "name": "fund",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "refund",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setPaused",
    "inputs": [{ "name": "_paused", "type": "bool" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getContribution",
    "inputs": [{ "name": "funder", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isGoalMet",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "timeLeft",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "factory",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "title",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "description",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "imageHash",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "goal",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "deadline",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "amountRaised",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimed",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "contributions",
    "inputs": [{ "name": "", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Funded",
    "inputs": [
      { "name": "funder", "type": "address", "indexed": true  },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      { "name": "owner",  "type": "address", "indexed": true  },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "Refunded",
    "inputs": [
      { "name": "funder", "type": "address", "indexed": true  },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "Paused",
    "inputs": [
      { "name": "paused", "type": "bool", "indexed": false }
    ]
  }
]
