import { useEffect, useRef } from 'react'
import { animate } from 'motion/mini'
import { passRailPercent } from '../presentation/passRail'
import { motionDuration, prefersReducedMotion } from '../presentation/uiMotion'

interface PassTimeRailProps {
  activeCode: string
  first: { code: string; name: string; time: string; href: string }
  second: { code: string; name: string; time: string; href: string }
}

export function PassTimeRail({ activeCode, first, second }: PassTimeRailProps) {
  const indicatorRef = useRef<HTMLSpanElement | null>(null)
  const position = passRailPercent(activeCode, first.code, second.code)

  useEffect(() => {
    if (!indicatorRef.current) return
    const controls = animate(
      indicatorRef.current,
      { left: `${position}%` },
      {
        duration: motionDuration(prefersReducedMotion(), 0.2),
        ease: 'easeOut',
      },
    )
    return () => controls.cancel()
  }, [position])

  return (
    <div className="pass-time-rail" aria-label={`Comparar ${first.code} y ${second.code}`}>
      <a className={activeCode === first.code ? 'pass-time-stop pass-time-stop--active' : 'pass-time-stop'} href={first.href}>
        <span>PASS 1 · {first.code}</span>
        <strong>{first.time}</strong>
        <small>{first.name}</small>
      </a>
      <div className="pass-time-track" aria-hidden="true">
        <span ref={indicatorRef} className="pass-time-indicator" style={{ left: `${position}%` }} />
      </div>
      <a className={activeCode === second.code ? 'pass-time-stop pass-time-stop--active' : 'pass-time-stop'} href={second.href}>
        <span>PASS 2 · {second.code}</span>
        <strong>{second.time}</strong>
        <small>{second.name}</small>
      </a>
    </div>
  )
}
