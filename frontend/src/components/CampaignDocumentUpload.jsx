/**
 * CampaignDocumentUpload.jsx
 * Shows category-specific document upload fields in CreateCampaign form.
 * Drop this into your campaign creation step 3 (Image step) or add as a new step.
 */

import { useState } from 'react'
import { getDocumentsForCategory } from '../utils/campaignDocuments'

export default function CampaignDocumentUpload({ category, onDocumentsChange }) {
  const [uploadedDocs, setUploadedDocs] = useState({})
  const [previews, setPreviews]         = useState({})

  const config = getDocumentsForCategory(category)
  if (!config) return null

  const handleFileChange = (docId, e) => {
    const file = e.target.files[0]
    if (!file) return

    const newDocs = { ...uploadedDocs, [docId]: file }
    setUploadedDocs(newDocs)

    // Preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPreviews(prev => ({ ...prev, [docId]: { type: 'image', url: ev.target.result } }))
      }
      reader.readAsDataURL(file)
    } else {
      setPreviews(prev => ({ ...prev, [docId]: { type: 'file', name: file.name } }))
    }

    onDocumentsChange?.(newDocs)
  }

  const removeDoc = (docId) => {
    const newDocs = { ...uploadedDocs }
    delete newDocs[docId]
    const newPreviews = { ...previews }
    delete newPreviews[docId]
    setUploadedDocs(newDocs)
    setPreviews(newPreviews)
    onDocumentsChange?.(newDocs)
  }

  const colorMap = {
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
    red:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700'    },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700'  },
    green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700'},
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700'},
    pink:   { bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700',   badge: 'bg-pink-100 text-pink-700'  },
  }

  const colors = colorMap[config.color] || colorMap.purple

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{config.icon}</span>
          <h3 className={`font-semibold ${colors.text}`}>
            {config.label} Campaign — Required Documents
          </h3>
        </div>
        <p className="text-sm text-gray-500">
          Upload supporting documents to verify your campaign is genuine. 
          Verified campaigns get more trust and donations.
        </p>
      </div>

      {/* Document upload fields */}
      {config.documents.map((doc) => {
        const uploaded = uploadedDocs[doc.id]
        const preview  = previews[doc.id]

        return (
          <div key={doc.id} className="border border-gray-200 rounded-xl p-4 space-y-2">
            {/* Doc header */}
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
                <p className="text-xs text-gray-400 italic mt-0.5">e.g. {doc.example}</p>
              </div>
            </div>

            {/* Upload area */}
            {!uploaded ? (
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center hover:border-purple-300 hover:bg-purple-50 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">Click to upload</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                </div>
                <input
                  type="file"
                  accept={doc.accept}
                  onChange={(e) => handleFileChange(doc.id, e)}
                  className="hidden"
                />
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
                    <p className="text-sm text-green-700 font-medium truncate max-w-[200px]">
                      {uploaded.name}
                    </p>
                    <p className="text-xs text-green-500">
                      {(uploaded.size / 1024).toFixed(1)} KB · Uploaded ✓
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeDoc(doc.id)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Verification notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
        🔒 Documents are reviewed by admins only. They are never shown publicly. 
        Campaigns without required documents may be rejected.
      </div>
    </div>
  )
}
