import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { rankCandidates } from '../lib/scoring'
import { fmtDist, meters, plural } from '../lib/geo'
import { useActivePoints, useApp } from '../lib/store'
import { setData } from '../map/bridge'
import { Note, Seg } from '../ui/bits'

const TOP = 15

export function Growth() {
  const active = useActivePoints()
  const focus = useApp(s => s.focus)
  const setFocus = useApp(s => s.setFocus)
  const radius = useApp(s => s.radius)
  const select = useApp(s => s.select)
  const selected = useApp(s => s.selected)
  const shortlist = useApp(s => s.shortlist)
  const toggle = useApp(s => s.toggleShortlist)
  const [onlyPartners, setOnlyPartners] = useState(false)

  const all = useMemo(() => rankCandidates(active, focus, radius), [active, focus, radius])
  // Соседние магазины делят одних покупателей, поэтому из каждого квартала берём лучшего.
  const list = useMemo(() => {
    const out: typeof all = []
    for (const c of onlyPartners ? all.filter(x => x.c) : all) {
      if (out.length === TOP) break
      if (!out.some(o => meters(o, c) < 350)) out.push(c)
    }
    return out
  }, [all, onlyPartners])

  useEffect(() => {
    setData('top', {
      type: 'FeatureCollection',
      features: list.map((c, i) => ({
        type: 'Feature',
        properties: { i: String(i + 1), id: c.id, n: c.n, on: selected?.id === c.id },
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
      })),
    })
  }, [list, selected])

  const exportCsv = () => {
    const rows = all.filter(c => shortlist.includes(c.id)).map(c => [c.n, c.a, c.score, c.bc, c.jk, c.house, Math.round(c.toUs)])
    const csv = [['Магазин', 'Адрес', 'Индекс', 'БЦ рядом', 'ЖК рядом', 'Домов рядом', 'До вашей точки, м'], ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
    a.download = 'kandidaty.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <h2 className="hero">Куда зайти следующими</h2>
      <p className="lede">Магазины, вокруг которых больше всего офисов и жилья, а вашей точки поблизости нет. Высота шестиугольника на карте показывает спрос в этом квартале.</p>

      <Seg id="f" label="Кто покупает" value={focus} onChange={setFocus} options={[{ v: 'office', t: 'Обед в офисе' }, { v: 'balance', t: 'Поровну' }, { v: 'home', t: 'Ужин дома' }]} />
      <label className="check">
        <input type="checkbox" checked={onlyPartners} onChange={e => setOnlyPartners(e.target.checked)} />
        <span>Только другие филиалы ваших сетей</span>
      </label>

      <ol className="cands">
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((c, i) => {
            const on = shortlist.includes(c.id)
            return (
              <motion.li key={c.id} layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={selected?.id === c.id ? 'cand is-on' : 'cand'}>
                <button className="cand-main" onClick={() => select({ kind: 'super', id: c.id, lat: c.lat, lon: c.lon })}>
                  <span className="cand-rank">{i + 1}</span>
                  <span className="cand-body">
                    <strong>{c.n}</strong>
                    <small>{c.a}</small>
                    <small className="why">
                      {c.bc} БЦ, {c.jk} ЖК, {c.house} {plural(c.house, 'дом', 'дома', 'домов')}. До «{c.nearestName}» {fmtDist(c.toUs)}
                    </small>
                    {c.c && <small className="tag">Филиал сети «{c.c}»</small>}
                  </span>
                  <span className="cand-score" title="Индекс от 0 до 100">{c.score}</span>
                </button>
                <button className={on ? 'plan on' : 'plan'} aria-pressed={on} onClick={() => toggle(c.id)}>
                  {on ? 'В плане' : 'В план'}
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ol>

      {shortlist.length > 0 && (
        <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="primary full" onClick={exportCsv}>
          Скачать план: {shortlist.length} {plural(shortlist.length, 'магазин', 'магазина', 'магазинов')}
        </motion.button>
      )}
      <Note>Индекс сравнивает магазины между собой и не предсказывает продажи. Учитывает объекты в радиусе {radius} м и расстояние до ближайшей вашей точки: слишком близкие и слишком далёкие магазины получают меньше баллов. Крупные сети исключены. В OpenStreetMap размечена только часть домов Бишкека, поэтому число домов занижено.</Note>
    </>
  )
}
