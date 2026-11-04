import { motion } from 'motion/react'
import { DATA } from '../lib/geo'
import { useApp } from '../lib/store'
import { Shape } from './bits'

const c = DATA.meta.counts

export function LayerDock() {
  const layers = useApp(s => s.layers)
  const toggle = useApp(s => s.toggleLayer)
  const items = [
    { k: 'stores', kind: 'store', t: 'Ваши точки', n: c.stores },
    { k: 'bc', kind: 'bc', t: 'Бизнес-центры', n: c.bc },
    { k: 'jk', kind: 'jk', t: 'Жилые комплексы', n: layers.jkPlanned ? c.jk : c.jkBuilt },
    { k: 'super', kind: 'super', t: 'Супермаркеты', n: c.super },
  ] as const
  return (
    <div className="dock" role="group" aria-label="Слои карты">
      {items.map(i => {
        const on = layers[i.k]
        return (
          <motion.button key={i.k} whileTap={{ scale: 0.95 }} className={on ? 'chip on' : 'chip'} aria-pressed={on} onClick={() => toggle(i.k)}>
            <Shape kind={i.kind} />
            <span>{i.t}</span>
            <b>{i.n}</b>
          </motion.button>
        )
      })}
      {layers.jk && (
        <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className={layers.jkPlanned ? 'chip small on' : 'chip small'} aria-pressed={layers.jkPlanned} onClick={() => toggle('jkPlanned')}>
          <span>Со стройками</span>
        </motion.button>
      )}
    </div>
  )
}
