import { AnimatePresence, motion } from 'motion/react'
import { DATA, fmtDist, nearest, within, type Point } from '../lib/geo'
import { useActivePoints, useApp, type Selected } from '../lib/store'
import { Shape } from './bits'

const TYPE = { store: 'Ваша точка', super: 'Супермаркет', bc: 'Бизнес-центр', jk: 'Жилой комплекс' }

function resolve(s: NonNullable<Selected>, active: ReturnType<typeof useActivePoints>): { name: string; addr: string; firm?: string; extra?: string; p: Point } | null {
  if (s.kind === 'store') {
    const a = active.find(x => x.key === s.id)
    return a ? { name: a.name, addr: a.a, firm: a.id, p: a } : null
  }
  if (s.kind === 'super') {
    const a = DATA.super.find(x => x.id === s.id)
    return a ? { name: a.n, addr: a.a, firm: a.id, p: a, extra: a.c ? `Филиал вашей сети «${a.c}»` : undefined } : null
  }
  if (s.kind === 'bc') {
    const a = DATA.bc.find(x => x.id === s.id)
    return a ? { name: a.n, addr: a.a, firm: a.id, p: a } : null
  }
  const a = DATA.jk.find(x => x.id === s.id)
  return a ? { name: a.n, addr: a.a, p: a, extra: a.built ? undefined : 'Ещё строится' } : null
}

export function SelectedCard() {
  const selected = useApp(s => s.selected)
  const select = useApp(s => s.select)
  const active = useActivePoints()
  const info = selected ? resolve(selected, active) : null
  const others = info ? active.filter(a => a.key !== selected?.id) : []
  const near = info ? nearest(info.p, others) : null
  const url = info ? (info.firm ? `https://2gis.kg/bishkek/firm/${info.firm}` : `https://2gis.kg/bishkek/search/${encodeURIComponent(info.name)}`) : ''
  return (
    <AnimatePresence>
      {info && selected && (
        <motion.aside key={selected.id} className="card" initial={{ y: 24, opacity: 0, rotate: 1.2 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 14, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
          <button className="card-close" aria-label="Закрыть" onClick={() => select(null)}>×</button>
          <p className="card-type"><Shape kind={selected.kind} /> {TYPE[selected.kind]}</p>
          <h3>{info.name}</h3>
          <p>{info.addr || 'Адрес не указан'}</p>
          {info.extra && <p className="card-extra">{info.extra}</p>}
          <dl>
            <div><dt>До вашей точки</dt><dd>{near?.item ? `${fmtDist(near.d)}, ${near.item.name}` : 'нет данных'}</dd></div>
            <div><dt>В 500 м</dt><dd>{within(info.p, DATA.bc, 500).length} БЦ, {within(info.p, DATA.jk.filter(j => j.built), 500).length} ЖК</dd></div>
          </dl>
          <a href={url} target="_blank" rel="noreferrer">Открыть в 2ГИС</a>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
