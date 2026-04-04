import { useState, useEffect } from 'react'

const CountdownTimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const calc = () => {
      const diff = deadline - Date.now()
      if (diff <= 0) { 
        setTimeLeft('Expired')
        return 
      }
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24))
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const m = Math.floor((diff / (1000 * 60)) % 60)
      
      if (d > 0) setTimeLeft(`${d}d ${h}h left`)
      else if (h > 0) setTimeLeft(`${h}h ${m}m left`)
      else setTimeLeft(`${m}m left`)
    }
    
    calc()
    const id = setInterval(calc, 60000)
    return () => clearInterval(id)
  }, [deadline])

  const isUrgent = deadline - Date.now() < 1000 * 60 * 60 * 24 * 3

  return (
    <span className={isUrgent ? 'text-red-400 font-medium' : ''}>
      {timeLeft}
    </span>
  )
}

export default CountdownTimer