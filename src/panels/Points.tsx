import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DATA, fmtDist, meters, plural, within } from '../lib/geo'
import { useActivePoints, useApp } from '../lib/store'
import { MENU } from '../data/menu'

export function Points() {
  const active = useActivePoints()
  const confirmed = useApp(s => s.confirmed)
  const confirm = useApp(s => s.confirm)
  const setBranch = useApp(s => s.setBranch)
  const select = useApp(s => s.select)
  const matrix = useApp(s => s.matrix)
  const radius = useApp(s => s.radius)
  const [open, setOpen] = useState<string | null>(null)
  const pending = active.filter(a => a.options > 1 && !confirmed[a.key]).length

  const stats = useMemo(
    () =>
      Object.fromEntries(
        active.map(a => {
          const others = active.filter(o => o.key !== a.key)
          const near = others.reduce((best, o) => (meters(a, o) < best.d ? { d: meters(a, o), n: o.name } : best), { d: Infinity, n: '' })
          return [a.key, { bc: within(a, DATA.bc, radius).length, jk: within(a, DATA.jk.filter(j => j.built), radius).length, near }]
        }),
      ),
    [active, radius],
  )

  return (
    <>
      <h2 className="hero">16 точек поставки</h2>
      <p className="lede">
        {pending > 0
          ? `У ${pending} ${plural(pending, 'сети', 'сетей', 'сетей')} в 2ГИС несколько адресов. Откройте точку и выберите филиал, куда вы возите еду.`
          : 'Все адреса подтверждены.'}
      </p>
      <ul className="points">
        {active.map(a => {
          const isOpen = open === a.key
          const st = stats[a.key]
          const items = MENU.filter((_, i) => matrix[`${a.key}:${i}`]).length
          const need = a.options > 1 && !confirmed[a.key]
          return (
            <motion.li layout="position" key={a.key} className={isOpen ? 'point open' : 'point'}>
              <button
                className="point-head"
                aria-expanded={isOpen}
                onClick={() => {
                  setOpen(isOpen ? null : a.key)
                  if (!isOpen) select({ kind: 'store', id: a.key, lat: a.lat, lon: a.lon })
                }}
              >
                <span className="point-name">{a.name}</span>
                <small>{a.a}</small>
                {need && <em className="flag">Проверить адрес</em>}
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div className="point-more" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
                    <dl className="facts">
                      <div><dt>БЦ в {radius} м</dt><dd>{st.bc}</dd></div>
                      <div><dt>ЖК в {radius} м</dt><dd>{st.jk}</dd></div>
                      <div><dt>Позиций меню</dt><dd>{items || 'нет'}</dd></div>
                    </dl>
                    <p className="near">Ближайшая ваша точка: {st.near.n}, {fmtDist(st.near.d)}</p>
                    {a.options > 1 && (
                      <fieldset className="branches">
                        <legend>Какой это филиал?</legend>
                        {DATA.stores.find(s => s.key === a.key)!.pts.map(p => (
                          <label key={p.id}>
                            <input
                              type="radio"
                              name={`b-${a.key}`}
                              checked={p.id === a.id}
                              onChange={() => {
                                setBranch(a.key, p.id)
                                select({ kind: 'store', id: a.key, lat: p.lat, lon: p.lon })
                              }}
                            />
                            <span>{p.a}</span>
                          </label>
                        ))}
                        {need && <button className="link on" onClick={() => confirm(a.key)}>Адрес верный</button>}
                      </fieldset>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          )
        })}
      </ul>
    </>
  )
}
