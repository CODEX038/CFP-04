import CountdownTimer from './CountdownTimer'
import ProgressBar from './ProgressBar'

const CampaignCard = ({ campaign, onClick }) => {
  const {
    title,
    description,
    goal,
    amountRaised,
    deadline,
    owner,
    ownerName,
    ownerUsername,
    imageHash,
    category,
    paused,
  } = campaign

  const pct   = Math.min((parseFloat(amountRaised) / parseFloat(goal)) * 100, 100)
  const short = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const isExpired = Date.now() > deadline
  const isGoalMet = parseFloat(amountRaised) >= parseFloat(goal)

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all group"
    >
      {/* Image */}
      <div className="w-full h-40 bg-gradient-to-br from-purple-50 to-purple-100 relative overflow-hidden">
        {imageHash ? (
          <img
            src={`https://gateway.pinata.cloud/ipfs/${imageHash}`}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {category && (
            <span className="bg-white text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full border border-purple-100 capitalize">
              {category}
            </span>
          )}
          {paused && (
            <span className="bg-red-100 text-red-600 text-xs font-medium px-2.5 py-1 rounded-full">
              Paused
            </span>
          )}
          {isGoalMet && !paused && (
            <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
              Funded
            </span>
          )}
          {isExpired && !isGoalMet && !paused && (
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
              Expired
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-1 group-hover:text-purple-700 transition-colors">
          {title}
        </h3>
        <p className="text-gray-500 text-sm mb-4 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Progress */}
        <ProgressBar percent={pct} />

        <div className="flex justify-between items-center mt-2 mb-4 text-sm">
          <div>
            <span className="font-semibold text-gray-900">
              {parseFloat(amountRaised).toFixed(3)} ETH
            </span>
            <span className="text-gray-400"> of {goal} ETH</span>
          </div>
          <span className={`font-medium ${pct >= 100 ? 'text-green-600' : 'text-purple-600'}`}>
            {Math.round(pct)}%
          </span>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-xs text-gray-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
              <span className="text-purple-600 font-bold" style={{ fontSize: '9px' }}>
                {ownerName
                  ? ownerName.slice(0, 2).toUpperCase()
                  : owner.slice(2, 4).toUpperCase()
                }
              </span>
            </div>
            <div className="min-w-0">
              {ownerName ? (
                <span className="text-gray-600 font-medium truncate">{ownerName}</span>
              ) : (
                <span className="font-mono truncate">{short(owner)}</span>
              )}
              {ownerUsername && (
                <span className="text-purple-400 ml-1">@{ownerUsername}</span>
              )}
            </div>
          </div>
          <CountdownTimer deadline={deadline} />
        </div>
      </div>
    </div>
  )
}

export default CampaignCard