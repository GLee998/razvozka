import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { MapStage } from './map/MapStage'
import { Curtain } from './ui/Curtain'
import { LayerDock } from './ui/LayerDock'
import { SelectedCard } from './ui/SelectedCard'
import { City } from './panels/City'
import { Growth } from './panels/Growth'
import { Points } from './panels/Points'
import { RoutePlan } from './panels/RoutePlan'
import { MenuGrid } from './panels/MenuGrid'
import { useApp, type Section } from './lib/store'

const NAV: { k: Section; t: string }[] = [
  { k: 'city', t: 'Город' },
  { k: 'growth', t: 'Рост' },
  { k: 'points', t: 'Точки' },
  { k: 'route', t: 'Маршрут' },
  { k: 'menu', t: 'Меню' },
]
const PANELS = { city: City, growth: Growth, points: Points, route: RoutePlan, menu: MenuGrid }

export function App() {
  const section = useApp(s => s.section)
  const setSection = useApp(s => s.setSection)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  const [sheet, setSheet] = useState(false)

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setOpen(true), 450)
    return () => clearTimeout(t)
  }, [ready])

  const Panel = PANELS[section]
  const wide = section === 'menu'

  return (
    <MotionConfig reducedMotion="user">
      <MapStage onReady={onReady} started={open} />
      {section !== 'menu' && section !== 'growth' && <LayerDock />}
      <SelectedCard />
      <motion.main
        className={`slab ${wide ? 'wide' : ''} ${sheet ? 'sheet-up' : ''}`}
        initial={false}
        animate={{ x: open ? 0 : -40, opacity: open ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 130, damping: 22, delay: open ? 0.5 : 0 }}
      >
        <button className="grabber" aria-label={sheet ? 'Свернуть панель' : 'Развернуть панель'} aria-expanded={sheet} onClick={() => setSheet(!sheet)}><span /></button>
        <header className="top">
          <p className="mark">Развозка</p>
          <nav aria-label="Разделы">
            {NAV.map(n => (
              <button key={n.k} aria-current={section === n.k ? 'page' : undefined} className={section === n.k ? 'on' : ''} onClick={() => setSection(n.k)}>
                {section === n.k && <motion.span layoutId="nav-blob" className="nav-blob" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                <em>{n.t}</em>
              </button>
            ))}
          </nav>
        </header>
        <div className="scroll">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section key={section} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}>
              <Panel />
            </motion.section>
          </AnimatePresence>
        </div>
      </motion.main>
      <Curtain open={open} ready={ready} />
    </MotionConfig>
  )
}
