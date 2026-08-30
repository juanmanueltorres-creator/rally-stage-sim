import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate } from 'motion/mini'
import { motionDuration, prefersReducedMotion } from '../presentation/uiMotion'

interface StageDisclosureProps {
  id: string
  label: string
  meta?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function StageDisclosure({ id, label, meta, defaultOpen = false, children }: StageDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!panelRef.current) return
    const controls = animate(
      panelRef.current,
      open
        ? { opacity: [0.72, 1], transform: ['translateY(-4px)', 'translateY(0px)'] }
        : { opacity: [1, 0.72], transform: ['translateY(0px)', 'translateY(-2px)'] },
      { duration: motionDuration(prefersReducedMotion(), 0.18), ease: 'easeOut' },
    )
    return () => controls.cancel()
  }, [open])

  return (
    <section className={`stage-disclosure${open ? ' stage-disclosure--open' : ''}`}>
      <button
        type="button"
        className="stage-disclosure-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{label}</span>
        {meta ? <small>{meta}</small> : null}
        <b aria-hidden="true">{open ? '−' : '+'}</b>
      </button>
      <div
        id={id}
        className="stage-disclosure-body"
        data-open={open ? 'true' : 'false'}
        aria-hidden={!open}
        inert={!open}
      >
        <div ref={panelRef} className="stage-disclosure-panel">
          {children}
        </div>
      </div>
    </section>
  )
}
