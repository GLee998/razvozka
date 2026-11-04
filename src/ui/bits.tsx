import type { ReactNode } from 'react'
import { motion } from 'motion/react'

export function Shape({ kind, size = 14 }: { kind: 'store' | 'super' | 'bc' | 'jk'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true }
  if (kind === 'store') return <svg {...common}><circle cx="8" cy="8" r="7" fill="#E8401C" stroke="#fff" strokeWidth="2" /></svg>
  if (kind === 'bc') return <svg {...common}><rect x="2" y="2" width="12" height="12" rx="2" fill="#2340D8" stroke="#fff" strokeWidth="1.5" /></svg>
  if (kind === 'jk') return <svg {...common}><path d="M8 1 15 8 8 15 1 8z" fill="#A3219A" stroke="#fff" strokeWidth="1.5" /></svg>
  return <svg {...common}><circle cx="8" cy="8" r="5" fill="#fff" stroke="#00866F" strokeWidth="3" /></svg>
}

export function Seg<T extends string | number>({ id, value, options, onChange, label }: { id: string; value: T; options: { v: T; t: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={o.v} role="radio" aria-checked={o.v === value} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>
          {o.v === value && <motion.span layoutId={`seg-${id}`} className="seg-blob" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <em>{o.t}</em>
        </button>
      ))}
    </div>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="note">{children}</p>
}
