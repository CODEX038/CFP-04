import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import axios from 'axios'
import { useWallet } from '../context/WalletContext'
import { useAuth } from '../context/AuthContext'
import { useIPFS } from '../hooks/useIPFS'
import { CONTRACT_ADDRESS, FACTORY_ABI } from '../utils/constants'
import { getDocumentsForCategory } from '../utils/campaignDocuments'

const STEPS = ['Details', 'Goal & deadline', 'Image', 'Documents', 'Review']
const API   = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const CreateCampaign = () => {
  const navigate = useNavigate()
  const { account, connectWallet, wrongNetwork, switchNetwork } = useWallet()
  const { user } = useAuth()
  const { uploadImage } = useIPFS()

  const [step, setStep]                 = useState(0)
  const [txStatus, setTxStatus]         = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile]       = useState(null)
  const [uploadedDocs, setUploadedDocs] = useState({})
  const [docPreviews, setDocPreviews]   = useState({})
  const [createdCampaignId, setCreatedCampaignId] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', goal: '', deadline: '', category: 'Technology',
  })
  const [errors, setErrors] = useState({})

  const categories = ['Technology', 'Environment', 'Education', 'Health', 'Community', 'Arts']

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const validateStep = () => {
    const e = {}
    if (step === 0) {
      if (!form.title.trim())           e.title = 'Title is required.'
      if (form.title.length > 80)       e.title = 'Title must be under 80 characters.'
      if (!form.description.trim())     e.description = 'Description is required.'
      if (form.description.length < 50) e.description = 'Description must be at least 50 characters.'
    }
    if (step === 1) {
      if (!form.goal || parseFloat(form.goal) <= 0) e.goal = 'Enter a valid goal in ETH.'
      if (!form.deadline) e.deadline = 'Select a deadline.'
      else if (new Date(form.deadline) <= new Date()) e.deadline = 'Deadline must be in the future.'
    }
    if (step === 3) {
      const config = getDocumentsForCategory(form.category)
      if (config) {
        const requiredDocs = config.documents.filter(d => d.required)
        const missingDocs  = requiredDocs.filter(d => !uploadedDocs[d.id])
        if (missingDocs.length > 0) {
          e.documents = `Please upload required documents: ${missingDocs.map(d => d.name).join(', ')}`
        }
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validateStep()) setStep((s) => s + 1) }
  const back = () => setStep((s) => s - 1)

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setErrors({ image: 'Image must be under 5MB.' }); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleDocFile = (docId, e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadedDocs(prev => ({ ...prev, [docId]: file }))
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setDocPreviews(p => ({ ...p, [docId]: { type: 'image', url: ev.target.result } }))
      reader.readAsDataURL(file)
    } else {
      setDocPreviews(p => ({ ...p, [docId]: { type: 'file', name: file.name } }))
    }
    setErrors(prev => ({ ...prev, documents: '' }))
  }

  const removeDoc = (docId) => {
    const d = { ...uploadedDocs }; delete d[docId]
    const p = { ...docPreviews };  delete p[docId]
    setUploadedDocs(d); setDocPreviews(p)
  }

  // ── Upload documents to Cloudinary via backend ────────────────────────────
  const uploadDocumentsToBackend = async (campaignId) => {
    if (!Object.keys(uploadedDocs).length) return
    try {
      const formData = new FormData()
      Object.entries(uploadedDocs).forEach(([docId, file]) => {
        formData.append(docId, file)
      })

      // ✅ Fixed: use 'admin_token' not 'token'
      const token = localStorage.getItem('admin_token')

      const { data } = await axios.post(
        `${API}/campaigns/${campaignId}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization:  `Bearer ${token}`,
          },
        }
      )
      console.log('✓ Documents uploaded to Cloudinary:', data.message)
    } catch (err) {
      console.warn('✗ Document upload failed:', err.response?.data?.message || err.message)
    }
  }

  const handleSubmit = async () => {
    if (!account) { connectWallet(); return }
    if (wrongNetwork) { switchNetwork(); return }

    setTxStatus('uploading')
    try {
      let imageHash = ''
      if (imageFile) imageHash = await uploadImage(imageFile)

      setTxStatus('pending')

      const provider   = new ethers.BrowserProvider(window.ethereum)
      const _signer    = await provider.getSigner()
      const factory    = new ethers.Contract(CONTRACT_ADDRESS, FACTORY_ABI, _signer)
      const deadlineTs = Math.floor(new Date(form.deadline).getTime() / 1000)
      const goalWei    = ethers.parseEther(form.goal)

      const tx      = await factory.createCampaign(form.title, form.description, imageHash, goalWei, deadlineTs)
      const receipt = await tx.wait()
      const event   = receipt.logs.find(l => l.fragment?.name === 'CampaignCreated')

      if (event) {
        try {
          const { data } = await axios.post(`${API}/campaigns`, {
            contractAddress: event.args.campaignAddress,
            factoryIndex:    Number(event.args.index),
            owner:           account,
            ownerName:       user?.name     || '',
            ownerUsername:   user?.username || '',
            title:           form.title,
            description:     form.description,
            imageHash,
            category:        form.category,
            goal:            form.goal,
            deadline:        deadlineTs,
            txHash:          receipt.hash,
          })

          // Extract MongoDB _id from response
          const campaignId = data?._id || data?.data?._id
          if (campaignId) {
            setCreatedCampaignId(campaignId)
            await uploadDocumentsToBackend(campaignId)
          } else {
            console.warn('No campaign _id returned from backend:', data)
          }
        } catch (backendErr) {
          console.warn('Backend save failed:', backendErr.response?.data?.message || backendErr.message)
        }
      }

      setTxStatus('success')
      setTimeout(() => navigate('/app'), 2500)
    } catch (err) {
      console.error(err)
      setTxStatus('error')
      setTimeout(() => setTxStatus(null), 4000)
    }
  }

  const deadlineMin = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const categoryColors = {
    Technology:  { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700'   },
    Education:   { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    Health:      { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700'    },
    Environment: { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700'  },
    Community:   { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    Arts:        { bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700'   },
  }

  if (!account) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <p className="text-gray-500">Connect your wallet to create a campaign.</p>
      <button onClick={connectWallet} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700">
        Connect wallet
      </button>
    </div>
  )

  if (wrongNetwork) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <p className="text-gray-500">Please switch to Sepolia Test Network to continue.</p>
      <button onClick={switchNetwork} className="bg-red-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-600">
        Switch to Sepolia
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create a campaign</h1>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i < step   ? 'bg-purple-600 text-white' :
                i === step ? 'bg-purple-600 text-white ring-4 ring-purple-100' :
                             'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${i === step ? 'text-purple-600 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-4 ${i < step ? 'bg-purple-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 0: Details ── */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign title</label>
            <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="A clear, descriptive title"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400" />
            <div className="flex justify-between mt-1">
              {errors.title ? <p className="text-red-500 text-xs">{errors.title}</p> : <span />}
              <span className="text-xs text-gray-400 ml-auto">{form.title.length}/80</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={5} value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="Tell people what you're building and why it matters (min. 50 characters)"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 resize-none" />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button key={cat} onClick={() => set('category', cat)}
                  className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                    form.category === cat ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 1: Goal & Deadline ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Funding goal (ETH)</label>
            <div className="relative">
              <input type="number" min="0.01" step="0.01" value={form.goal}
                onChange={(e) => set('goal', e.target.value)} placeholder="e.g. 10"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-16 text-sm outline-none focus:border-purple-400" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">ETH</span>
            </div>
            {errors.goal && <p className="text-red-500 text-xs mt-1">{errors.goal}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <input type="date" min={deadlineMin} value={form.deadline}
              onChange={(e) => set('deadline', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400" />
            {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            If your goal is met before the deadline, you can withdraw all funds.
            If not, funders can claim a full refund after the deadline.
          </div>
        </div>
      )}

      {/* ── Step 2: Image ── */}
      {step === 2 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Campaign image (optional)</label>
          <label className="block cursor-pointer">
            <div className={`w-full h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-colors ${
              imagePreview ? 'border-purple-300' : 'border-gray-200 hover:border-purple-300'
            }`}>
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" className="mb-3">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                  <p className="text-sm text-gray-500">Click to upload image</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                </>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </label>
          {imagePreview && (
            <button onClick={() => { setImagePreview(null); setImageFile(null) }}
              className="text-sm text-red-400 hover:text-red-600">
              Remove image
            </button>
          )}
          {errors.image && <p className="text-red-500 text-xs">{errors.image}</p>}
        </div>
      )}

      {/* ── Step 3: Documents ── */}
      {step === 3 && (() => {
        const config = getDocumentsForCategory(form.category)
        const colors = categoryColors[form.category] || categoryColors.Technology

        if (!config) return (
          <div className="text-center py-12 text-gray-400">
            No document requirements for this category.
          </div>
        )

        return (
          <div className="space-y-4">
            <div className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{config.icon}</span>
                <h3 className={`font-semibold ${colors.text}`}>
                  {config.label} Campaign — Verification Documents
                </h3>
              </div>
              <p className="text-sm text-gray-500">
                Upload documents to verify your campaign is genuine.
                Verified campaigns get more trust and donations from donors.
              </p>
            </div>

            {config.documents.map((doc) => {
              const preview = docPreviews[doc.id]
              const file    = uploadedDocs[doc.id]

              return (
                <div key={doc.id} className="border border-gray-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{doc.name}</p>
                        {doc.required
                          ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Required</span>
                          : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Optional</span>
                        }
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{doc.description}</p>
                      <p className="text-xs text-gray-400 italic">e.g. {doc.example}</p>
                    </div>
                  </div>

                  {!file ? (
                    <label className="block cursor-pointer">
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center hover:border-purple-300 hover:bg-purple-50 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <p className="text-sm text-gray-500 font-medium">Click to upload</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC up to 10MB</p>
                      </div>
                      <input type="file" accept={doc.accept} onChange={(e) => handleDocFile(doc.id, e)} className="hidden" />
                    </label>
                  ) : (
                    <div className="border border-green-200 bg-green-50 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {preview?.type === 'image' ? (
                          <img src={preview.url} alt="preview" className="w-10 h-10 object-cover rounded-lg border" />
                        ) : (
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-green-700 font-medium truncate max-w-[200px]">{file.name}</p>
                          <p className="text-xs text-green-500">{(file.size / 1024).toFixed(1)} KB · Ready to upload ✓</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeDoc(doc.id)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {errors.documents && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                ⚠ {errors.documents}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              🔒 Documents are reviewed by admins only and never shown publicly.
              Your campaign will be marked as <strong>pending verification</strong> until approved.
            </div>
          </div>
        )
      })()}

      {/* ── Step 4: Review ── */}
      {step === 4 && (
        <div className="space-y-4">
          {txStatus === 'success' ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Campaign created!</h2>
              <p className="text-gray-500 text-sm mb-1">Your documents have been submitted for admin review.</p>
              <p className="text-gray-400 text-xs">Redirecting to home page...</p>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-2xl p-5 space-y-3 text-sm">
                {user?.name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Creator</span>
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </div>
                )}
                {user?.username && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Username</span>
                    <span className="text-purple-600">@{user.username}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Title</span>
                  <span className="font-medium text-gray-900 max-w-xs text-right">{form.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="capitalize text-gray-900">{form.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Goal</span>
                  <span className="font-medium text-gray-900">{form.goal} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Deadline</span>
                  <span className="text-gray-900">{new Date(form.deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Image</span>
                  <span className="text-gray-900">{imageFile ? imageFile.name : 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Documents</span>
                  <span className={`font-medium ${Object.keys(uploadedDocs).length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {Object.keys(uploadedDocs).length} uploaded
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="text-gray-500">Wallet</span>
                  <span className="font-mono text-xs text-gray-700">{account}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-600">
                ℹ Your campaign will be visible immediately but marked as
                <strong> pending verification</strong> until an admin reviews your documents.
              </div>

              {txStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  Transaction failed. Please try again.
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={txStatus === 'uploading' || txStatus === 'pending'}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {txStatus === 'uploading' ? 'Uploading to IPFS...' :
                 txStatus === 'pending'   ? 'Confirming transaction...' :
                 'Deploy campaign'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Nav buttons */}
      {txStatus !== 'success' && (
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          <button onClick={back} disabled={step === 0}
            className="px-6 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-30">
            Back
          </button>
          {step < STEPS.length - 1 && (
            <button onClick={next}
              className="px-6 py-2 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700">
              Continue
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default CreateCampaign
