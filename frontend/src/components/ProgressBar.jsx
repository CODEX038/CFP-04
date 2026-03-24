const ProgressBar = ({ percent }) => (
  <div className="w-full bg-gray-100 rounded-full h-2">
    <div
      className={`h-2 rounded-full transition-all ${
        percent >= 100 ? 'bg-green-500' : 'bg-purple-500'
      }`}
      style={{ width: `${Math.min(percent, 100)}%` }}
    />
  </div>
)

export default ProgressBar