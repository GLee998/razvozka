import { AnimatePresence, motion } from 'motion/react'

// Гребень Ала-Тоо: шторка уходит вверх и открывает город.
const RIDGE = 'M0 64 L70 30 L118 52 L190 8 L246 46 L300 22 L372 60 L440 18 L500 44 L566 4 L640 50 L702 26 L770 58 L842 12 L900 42 L970 20 L1040 56 L1110 28 L1180 48 L1260 10 L1330 52 L1400 26 L1440 40 L1440 0 L0 0 Z'

export function Curtain({ open, ready }: { open: boolean; ready: boolean }) {
  return (
    <AnimatePresence>
      {!open && (
        <motion.div className="curtain" exit={{ y: '-112%' }} transition={{ duration: 1.15, ease: [0.76, 0, 0.18, 1] }}>
          <motion.h1 initial={{ y: 26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}>
            Развозка
          </motion.h1>
          <p>{ready ? 'Бишкек готов' : 'Загружаем карту Бишкека'}</p>
          <svg className="ridge" viewBox="0 0 1440 66" preserveAspectRatio="none" aria-hidden="true">
            <path d={RIDGE} />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
