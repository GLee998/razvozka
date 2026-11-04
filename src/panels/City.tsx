import { useMemo } from 'react'
import { motion } from 'motion/react'
import NumberFlow from '@number-flow/react'
import { byDistrict, coverage } from '../lib/scoring'
import { DATA, plural } from '../lib/geo'
import { useActivePoints, useApp } from '../lib/store'
import { Note, Seg, Shape } from '../ui/bits'

export function City() {
  const active = useActivePoints()
  const radius = useApp(s => s.radius)
  const setRadius = useApp(s => s.setRadius)
  const cover = useApp(s => s.layers.cover)
  const toggle = useApp(s => s.toggleLayer)
  const c = useMemo(() => coverage(active, radius), [active, radius])
  const districts = useMemo(() => byDistrict(active), [active])
  const rows = [
    { kind: 'bc', t: 'Бизнес-центры', ...c.bc },
    { kind: 'jk', t: 'Жилые комплексы', ...c.jk },
    { kind: 'super', t: 'Другие супермаркеты', ...c.sup },
  ] as const
  const centre = districts.reduce((a, b) => (b.ours > a.ours ? b : a))
  const empty = districts.reduce((a, b) => (b.ours < a.ours ? b : a))

  return (
    <>
      <h2 className="hero">
        <NumberFlow value={c.bc.pct} suffix="%" /> бизнес-центров рядом с вашими точками
      </h2>
      <p className="lede">
        Столько офисных зданий находится не дальше {radius} м от магазина, куда вы уже возите еду. Жилых комплексов в этом же радиусе <NumberFlow value={c.jk.pct} suffix="%" />.
      </p>

      <div className="row-between">
        <Seg id="r" label="Радиус" value={radius} onChange={setRadius} options={[300, 500, 800, 1200].map(v => ({ v, t: v < 1000 ? `${v} м` : '1,2 км' }))} />
        <button className={cover ? 'link on' : 'link'} onClick={() => toggle('cover')} aria-pressed={cover}>
          {cover ? 'Скрыть зоны' : 'Показать зоны'}
        </button>
      </div>

      <div className="bars">
        {rows.map(r => (
          <div className="bar" key={r.t} title={`${r.t}: ${r.n} из ${r.of}`}>
            <div className="bar-head">
              <Shape kind={r.kind} />
              <span>{r.t}</span>
              <b>
                <NumberFlow value={r.n} /> из {r.of}
              </b>
            </div>
            <div className="track">
              <motion.i animate={{ width: `${Math.max(r.pct, 1)}%` }} initial={{ width: 0 }} transition={{ type: 'spring', stiffness: 90, damping: 18 }} />
            </div>
          </div>
        ))}
      </div>

      <h3>По районам</h3>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Район</th>
            <th scope="col">Ваши</th>
            <th scope="col">Суперм.</th>
            <th scope="col">БЦ</th>
            <th scope="col">ЖК</th>
          </tr>
        </thead>
        <tbody>
          {districts.map(d => (
            <tr key={d.d}>
              <th scope="row">{d.d}</th>
              <td className="strong">{d.ours}</td>
              <td>{d.sup}</td>
              <td>{d.bc}</td>
              <td>{d.jk}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="insight">
        Больше всего ваших точек в районе {centre.d} ({centre.ours}). В районе {empty.d} {empty.ours === 0 ? 'нет ни одной' : `только ${empty.ours} ${plural(empty.ours, 'точка', 'точки', 'точек')}`}, хотя там {empty.jk} {plural(empty.jk, 'жилой комплекс', 'жилых комплекса', 'жилых комплексов')} и {empty.bc} {plural(empty.bc, 'бизнес-центр', 'бизнес-центра', 'бизнес-центров')}.
      </p>
      <Note>
        Данные 2ГИС и OpenStreetMap на {new Date(DATA.meta.fetched).toLocaleDateString('ru-RU')}. Считаются только сданные жилые комплексы. Адреса некоторых точек пока выбраны автоматически: проверьте их в разделе «Точки».
      </Note>
    </>
  )
}
