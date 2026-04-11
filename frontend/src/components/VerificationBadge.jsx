/**
 * components/VerificationBadge.jsx
 * Shows user verification status consistently across the app
 * 
 * Usage:
 * <VerificationBadge user={user} />
 * <VerificationBadge isVerified={true} />
 */

export default function VerificationBadge({ user, isVerified, size = 'sm', showIcon = true }) {
  // Determine verification status
  const verified = user ? user.isVerified : isVerified
  
  if (!verified) return null

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  const iconSizes = {
    xs: 8,
    sm: 10,
    md: 12,
    lg: 14
  }

  return (
    <span className={`inline-flex items-center gap-1 bg-green-100 text-green-700 rounded-full font-medium ${sizeClasses[size]}`}>
      {showIcon && (
        <svg 
          width={iconSizes[size]} 
          height={iconSizes[size]} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3"
        >
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      )}
      Verified
    </span>
  )
}

/**
 * Verification badge for document status (pending, rejected)
 */
export function DocumentStatusBadge({ status, size = 'sm' }) {
  if (!status || status === 'verified') return null

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1'
  }

  const statusConfig = {
    pending: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
      label: 'Pending verification'
    },
    rejected: {
      bg: 'bg-red-100',
      text: 'text-red-600',
      border: 'border-red-200',
      label: 'Verification rejected'
    }
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <span className={`inline-flex items-center gap-1 ${config.bg} ${config.text} border ${config.border} rounded-full font-medium ${sizeClasses[size]}`}>
      {config.label}
    </span>
  )
}
