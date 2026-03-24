/**
 * CampaignVerificationBadge.jsx
 * Shows verification status on campaign cards and detail pages.
 * Usage: <CampaignVerificationBadge status={campaign.verificationStatus} />
 */

export default function CampaignVerificationBadge({ status, showLabel = true }) {
  const config = {
    verified:   { icon: '✅', label: 'Verified',   bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200' },
    pending:    { icon: '⏳', label: 'Under Review', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    rejected:   { icon: '❌', label: 'Rejected',   bg: 'bg-red-100',    text: 'text-red-600',    border: 'border-red-200'   },
    unverified: { icon: '📄', label: 'Unverified', bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-200'  },
  }

  const c = config[status] || config.unverified

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {c.icon}
      {showLabel && c.label}
    </span>
  )
}
