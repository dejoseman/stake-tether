import React, { useState, useEffect } from 'react'
import { Clock, CheckCircle } from 'lucide-react'

/**
 * CountdownTimer — Reusable countdown component for staking maturity dates.
 * 
 * Props:
 *   maturityDate  — ISO date string of when the stake matures
 *   compact       — (optional) if true, renders a smaller inline badge style
 * 
 * Displays:  "XXd : XXh : XXm" while counting down
 *            Green "Complete" badge when countdown reaches zero
 */
export default function CountdownTimer({ maturityDate, compact = false }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(maturityDate))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(maturityDate))
    }, 1000)

    return () => clearInterval(interval)
  }, [maturityDate])

  if (timeLeft.isComplete) {
    return (
      <span style={{
        background: '#dcfce7',
        color: '#15803d',
        padding: compact ? '2px 8px' : '4px 12px',
        borderRadius: '6px',
        fontSize: compact ? '11px' : '12px',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        <CheckCircle size={compact ? 12 : 14} /> Complete
      </span>
    )
  }

  return (
    <span style={{
      fontVariantNumeric: 'tabular-nums',
      fontWeight: 700,
      fontSize: compact ? '13px' : '16px',
      color: '#1a1a2e',
      display: 'inline-flex',
      alignItems: 'center',
      gap: compact ? '6px' : '8px',
    }}>
      {!compact && <Clock size={18} color="#0ea5e9" />}
      <span>
        {timeLeft.days > 0 && `${timeLeft.days}d : `}
        {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m
      </span>
    </span>
  )
}

function getTimeLeft(maturityDate) {
  const target = new Date(maturityDate).getTime()
  const now = Date.now()
  const diff = target - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true }
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    isComplete: false,
  }
}
