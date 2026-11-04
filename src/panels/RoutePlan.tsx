import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Reorder } from 'motion/react'
import NumberFlow from '@number-flow/react'
import { optimize, roadRoute, type RouteResult } from '../lib/route'
import { plural } from '../lib/geo'
import { useActivePoints, useApp } from '../lib/store'
import { fitPoints, playRoute, setData, stopRoute } from '../map/bridge'
import { Note } from '../ui/bits'

export function RoutePlan() {
  const active = useActivePoints()
  const stops = useApp(s => s.stops)
  const setStops = useApp(s => s.setStops)
  const base = useApp(s => s.base)
  const setBase = useApp(s => s.setBase)
  const picking = useApp(s => s.pickingBase)
  const setPicking = useApp(s => s.setPickingBase)
  const [perStop, setPerStop] = useState(7)
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [busy, setBusy] = useState(false)
  const abort = useRef<AbortController | null>(null)

  const byKey = useMemo(() => new Map(active.map(a => [a.key, a])), [active])
  const ordered = useMemo(() => stops.map(k => byKey.get(k)).filter(Boolean) as typeof active, [stops, byKey])
  const off = active.filter(a => !stops.includes(a.key))

  useEffect(() => {
    setData('stops', {
      type: 'FeatureCollection',
      features: ordered.map((a, i) => ({ type: 'Feature', properties: { i: String(i + 1) }, geometry: { type: 'Point', coordinates: [a.lon, a.lat] } })),
    })
  }, [ordered])

  const build = useCallback(async () => {
    abort.current?.abort()
    if (ordered.length < 2) return setRoute(null)
    const ctl = new AbortController()
    abort.current = ctl
    setBusy(true)
    const way = base ? [base, ...ordered, base] : ordered
    try {
      const r = await roadRoute(way, ctl.signal)
      setRoute(r)
      playRoute(r.coords)
    } catch {
      /* запрос отменён новым порядком */
    } finally {
      if (abort.current === ctl) setBusy(false)
    }
  }, [ordered, base])

  useEffect(() => {
    const t = setTimeout(build, 420)
    return () => clearTimeout(t)
  }, [build])

  useEffect(() => {
    fitPoints(active, { pitch: 28 })
    return () => {
      abort.current?.abort()
      stopRoute()
    }
  }, [active])

  const remove = (k: string) => setStops(stops.filter(x => x !== k))
  const auto = () => setStops(optimize(ordered, base).map(a => a.key))
  const total = route ? route.min + perStop * ordered.length : 0
  const h = Math.floor(total / 60)
  const m = Math.round(total % 60)

  return (
    <>
      <h2 className="hero">Маршрут на {ordered.length} {plural(ordered.length, 'точку', 'точки', 'точек')}</h2>
      <dl className="route-stats" aria-busy={busy}>
        <div>
          <dt>Путь</dt>
          <dd><NumberFlow value={route ? Math.round(route.km * 10) / 10 : 0} locales="ru-RU" /> км</dd>
        </div>
        <div>
          <dt>Смена</dt>
          <dd>{h > 0 && <><NumberFlow value={h} /> ч </>}<NumberFlow value={m} /> мин</dd>
        </div>
      </dl>
      <div className="row-between">
        <button className="primary" onClick={auto}>Выстроить короче</button>
        <button className="link on" onClick={() => route && playRoute(route.coords)} disabled={!route}>Проехать ещё раз</button>
      </div>
      <div className="row-between mt">
        <label className="stepper">
          Минут на разгрузку
          <input type="number" min={0} max={60} value={perStop} onChange={e => setPerStop(Math.max(0, Math.min(60, +e.target.value || 0)))} />
        </label>
        {base ? (
          <button className="link on" onClick={() => setBase(null)}>Убрать кухню</button>
        ) : (
          <button className={picking ? 'link pick' : 'link on'} onClick={() => setPicking(!picking)}>
            {picking ? 'Нажмите на карту' : 'Указать кухню на карте'}
          </button>
        )}
      </div>

      <Reorder.Group axis="y" values={stops} onReorder={setStops} className="stops">
        {stops.map((k, i) => {
          const a = byKey.get(k)
          if (!a) return null
          return (
            <Reorder.Item key={k} value={k} className="stop" whileDrag={{ scale: 1.03, boxShadow: '0 12px 28px rgba(0,0,0,.35)' }}>
              <span className="stop-num">{i + 1}</span>
              <span className="stop-body">
                <strong>{a.name}</strong>
                <small>{a.a}</small>
              </span>
              <button className="x" aria-label={`Убрать ${a.name} из маршрута`} onClick={() => remove(k)}>Убрать</button>
            </Reorder.Item>
          )
        })}
      </Reorder.Group>
      {off.length > 0 && (
        <>
          <h3>Не в этом рейсе</h3>
          <div className="off">
            {off.map(a => (
              <button key={a.key} className="chip-dark" onClick={() => setStops([...stops, a.key])}>{a.name}</button>
            ))}
          </div>
        </>
      )}
      <Note>
        {route && !route.roads ? 'Сервис дорог не ответил, поэтому линия показана напрямую, а длина оценена. ' : 'Дороги считает открытый сервис OSRM, он не учитывает пробки. '}
        {base ? 'Рейс начинается и заканчивается на кухне.' : 'Кухня не указана, поэтому обратный путь не считается.'} Порядок можно менять перетаскиванием.
      </Note>
    </>
  )
}
