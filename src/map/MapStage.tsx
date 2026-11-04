import type * as GeoJSON from 'geojson'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { C, mapStyle } from './style'
import { attachMap, clearRoute, fitPoints, flyToPoint, getMap, growHexes, markReady, padding, reduced, setData, setVisible, whenReady } from './bridge'
import { CENTER, DATA, circle } from '../lib/geo'
import { useActivePoints, useApp } from '../lib/store'
import { demandHexes } from '../lib/scoring'

maplibregl.setWorkerUrl(workerUrl)

const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features })
const pt = (lon: number, lat: number, properties: Record<string, unknown>): GeoJSON.Feature => ({ type: 'Feature', properties, geometry: { type: 'Point', coordinates: [lon, lat] } })

// Форма значка дублирует цвет: слои различимы и без цветового зрения.
function shape(kind: 'square' | 'diamond' | 'ring', color: string) {
  const s = 32
  const c = document.createElement('canvas')
  c.width = c.height = s
  const x = c.getContext('2d')!
  x.fillStyle = color
  x.strokeStyle = '#fff'
  x.lineWidth = 3
  if (kind === 'square') {
    x.beginPath()
    x.roundRect(6, 6, 20, 20, 3)
    x.fill()
    x.stroke()
  } else if (kind === 'diamond') {
    x.beginPath()
    x.moveTo(16, 3)
    x.lineTo(29, 16)
    x.lineTo(16, 29)
    x.lineTo(3, 16)
    x.closePath()
    x.fill()
    x.stroke()
  } else {
    x.beginPath()
    x.arc(16, 16, 10, 0, Math.PI * 2)
    x.fillStyle = '#fff'
    x.fill()
    x.lineWidth = 5
    x.strokeStyle = color
    x.stroke()
  }
  return x.getImageData(0, 0, s, s)
}

const iconSize: any = ['interpolate', ['linear'], ['zoom'], 10, 0.42, 13, 0.68, 16, 0.95]
const labelLayout = (color = C.ink): any => ({
  layout: { 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 1.15], 'text-anchor': 'top', 'text-max-width': 8, 'text-optional': true },
  paint: { 'text-color': color, 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
})

function addEverything(m: maplibregl.Map) {
  m.addImage('i-bc', shape('square', C.cobalt), { pixelRatio: 2 })
  m.addImage('i-jk', shape('diamond', C.magenta), { pixelRatio: 2 })
  m.addImage('i-jkp', shape('diamond', '#C98FC4'), { pixelRatio: 2 })
  m.addImage('i-super', shape('ring', C.teal), { pixelRatio: 2 })

  const empty = fc([])
  for (const id of ['cover', 'hex', 'route', 'route-ghost', 'stops', 'top', 'super', 'bc', 'jk']) m.addSource(id, { type: 'geojson', data: empty })
  m.addSource('store-labels', { type: 'geojson', data: empty })

  m.addLayer({ id: 'cover-fill', type: 'fill', source: 'cover', paint: { 'fill-color': C.tomato, 'fill-opacity': 0.13 } })
  m.addLayer({ id: 'cover-line', type: 'line', source: 'cover', paint: { 'line-color': C.tomato, 'line-width': 1.2, 'line-opacity': 0.65 } })
  m.addLayer({
    id: 'hex',
    type: 'fill-extrusion',
    source: 'hex',
    layout: { visibility: 'none' },
    paint: {
      'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'v'], 0, '#FFE9A8', 0.25, C.yolk, 0.6, '#F7832A', 1, C.tomato],
      'fill-extrusion-height': 0,
      'fill-extrusion-opacity': 0.82,
    },
  })
  m.addLayer({ id: 'super', type: 'symbol', source: 'super', layout: { 'icon-image': 'i-super', 'icon-size': iconSize, 'icon-allow-overlap': true } })
  m.addLayer({ id: 'jk', type: 'symbol', source: 'jk', layout: { 'icon-image': ['case', ['get', 'built'], 'i-jk', 'i-jkp'], 'icon-size': iconSize, 'icon-allow-overlap': true } })
  m.addLayer({ id: 'bc', type: 'symbol', source: 'bc', layout: { 'icon-image': 'i-bc', 'icon-size': iconSize, 'icon-allow-overlap': true } })
  for (const id of ['super', 'jk', 'bc']) {
    const l = labelLayout()
    m.addLayer({ id: `${id}-label`, type: 'symbol', source: id, minzoom: 15, layout: l.layout, paint: l.paint })
  }
  m.addLayer({ id: 'route-ghost', type: 'line', source: 'route-ghost', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.ink, 'line-width': 2, 'line-opacity': 0.22 } })
  m.addLayer({ id: 'route-case', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fff', 'line-width': 7 } })
  m.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.ink, 'line-width': 3.5 } })
  m.addLayer({ id: 'stops-dot', type: 'circle', source: 'stops', paint: { 'circle-radius': 11, 'circle-color': C.ink, 'circle-stroke-color': C.yolk, 'circle-stroke-width': 2 } })
  m.addLayer({ id: 'stops-num', type: 'symbol', source: 'stops', layout: { 'text-field': ['get', 'i'], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-allow-overlap': true }, paint: { 'text-color': '#fff' } })
  m.addLayer({ id: 'top-dot', type: 'circle', source: 'top', paint: { 'circle-radius': ['case', ['get', 'on'], 15, 12], 'circle-color': C.yolk, 'circle-stroke-color': C.ink, 'circle-stroke-width': 2, 'circle-pitch-alignment': 'viewport' } })
  m.addLayer({ id: 'top-num', type: 'symbol', source: 'top', layout: { 'text-field': ['get', 'i'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true, 'text-pitch-alignment': 'viewport' }, paint: { 'text-color': C.ink } })
  const sl = labelLayout(C.ink)
  m.addLayer({ id: 'store-label', type: 'symbol', source: 'store-labels', minzoom: 11.5, layout: { ...sl.layout, 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-offset': [0, 1.05] }, paint: sl.paint })
}

const CAMERA = {
  city: { zoom: 12.05, pitch: 0, bearing: 0 },
  growth: { zoom: 11.95, pitch: 50, bearing: -16 },
  points: { zoom: 12.35, pitch: 0, bearing: 0 },
  route: { zoom: 12.1, pitch: 30, bearing: 0 },
  menu: { zoom: 11.4, pitch: 0, bearing: 0 },
}

export function MapStage({ onReady, started }: { onReady: () => void; started: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const active = useActivePoints()
  const section = useApp(s => s.section)
  const layers = useApp(s => s.layers)
  const radius = useApp(s => s.radius)
  const focus = useApp(s => s.focus)
  const selected = useApp(s => s.selected)
  const base = useApp(s => s.base)
  const pickingBase = useApp(s => s.pickingBase)
  const pins = useRef(new Map<string, maplibregl.Marker>())
  const ring = useRef<maplibregl.Marker | null>(null)
  const baseMarker = useRef<maplibregl.Marker | null>(null)

  useEffect(() => {
    const m = new maplibregl.Map({
      container: box.current!,
      style: mapStyle,
      center: CENTER,
      zoom: 10.6,
      pitch: 0,
      minZoom: 9.5,
      maxZoom: 18,
      maxBounds: [[74.2, 42.6], [75.0, 43.1]],
      attributionControl: false,
      fadeDuration: 150,
    })
    attachMap(m)
    m.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: 'Адреса: 2ГИС' }), 'bottom-right')
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('load', () => {
      addEverything(m)
      markReady()
      onReady()
    })
    const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: 'hint' })
    const hoverable = ['bc', 'jk', 'super', 'top-dot']
    m.on('mousemove', e => {
      const live = hoverable.filter(l => m.getLayer(l))
      const f = m.queryRenderedFeatures(e.point, { layers: live })[0]
      m.getCanvas().style.cursor = useApp.getState().pickingBase ? 'crosshair' : f ? 'pointer' : ''
      if (f) pop.setLngLat(e.lngLat).setText(String(f.properties.n)).addTo(m)
      else pop.remove()
    })
    m.on('click', e => {
      const st = useApp.getState()
      if (st.pickingBase) {
        st.setBase({ lat: e.lngLat.lat, lon: e.lngLat.lng })
        st.setPickingBase(false)
        return
      }
      const f = m.queryRenderedFeatures(e.point, { layers: hoverable.filter(l => m.getLayer(l)) })[0]
      if (!f) return st.select(null)
      const [lon, lat] = (f.geometry as GeoJSON.Point).coordinates
      const kind = f.layer.id === 'top-dot' ? 'super' : (f.layer.id as 'bc' | 'jk' | 'super')
      st.select({ kind, id: String(f.properties.id), lat, lon })
    })
    return () => m.remove()
  }, [onReady])

  // Статичные слои и выбор сетей.
  useEffect(() => {
    const own = new Set(active.map(a => a.id))
    setData('super', fc(DATA.super.filter(s => !own.has(s.id)).map(s => pt(s.lon, s.lat, { id: s.id, n: s.n }))))
    setData('store-labels', fc(active.map(a => pt(a.lon, a.lat, { n: a.name }))))
  }, [active])
  useEffect(() => {
    setData('bc', fc(DATA.bc.map(b => pt(b.lon, b.lat, { id: b.id, n: b.n }))))
    setData('jk', fc(DATA.jk.filter(j => j.built || layers.jkPlanned).map(j => pt(j.lon, j.lat, { id: j.id, n: j.n, built: j.built }))))
  }, [layers.jkPlanned])

  // Булавки ваших точек, штампуются по очереди после открытия шторки.
  useEffect(() => {
    if (!started) return
    whenReady(() => {
      const m = getMap()!
      const seen = new Set<string>()
      active.forEach((a, i) => {
        seen.add(a.key)
        const had = pins.current.get(a.key)
        if (had) return void had.setLngLat([a.lon, a.lat])
        const el = document.createElement('button')
        el.className = 'pin'
        el.setAttribute('aria-label', `${a.name}, ${a.a}`)
        el.innerHTML = '<i></i>'
        ;(el.firstChild as HTMLElement).style.animationDelay = reduced() ? '0ms' : `${500 + i * 85}ms`
        el.onclick = ev => {
          ev.stopPropagation()
          const cur = useApp.getState()
          const p = (cur.branch[a.key] ? DATA.stores.find(s => s.key === a.key)!.pts.find(x => x.id === cur.branch[a.key]) : null) ?? DATA.stores.find(s => s.key === a.key)!.pts[0]
          cur.select({ kind: 'store', id: a.key, lat: p.lat, lon: p.lon })
        }
        pins.current.set(a.key, new maplibregl.Marker({ element: el }).setLngLat([a.lon, a.lat]).addTo(m))
      })
    })
  }, [active, started])

  useEffect(() => {
    pins.current.forEach(p => p.getElement().classList.toggle('pin-hidden', !layers.stores || section === 'route'))
    setVisible('store-label', layers.stores)
  }, [layers.stores, started, section])

  useEffect(() => {
    const route = section === 'route'
    const growth = section === 'growth'
    for (const id of ['super', 'bc', 'jk'] as const) {
      const on = layers[id] && !growth
      setVisible(id, on)
      setVisible(`${id}-label`, on)
    }
    setVisible('cover-fill', layers.cover)
    setVisible('cover-line', layers.cover)
    setVisible('top-dot', growth)
    setVisible('top-num', growth)
    setVisible('stops-dot', route)
    setVisible('stops-num', route)
    setVisible('route', route)
    setVisible('route-case', route)
    setVisible('route-ghost', route)
    if (!route) clearRoute()
  }, [layers, section])

  useEffect(() => {
    setData('cover', fc(active.map(a => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circle(a, radius)] } }) as GeoJSON.Feature)))
  }, [active, radius])

  useEffect(() => {
    setData('hex', demandHexes(focus))
  }, [focus])

  useEffect(() => {
    growHexes(section === 'growth')
  }, [section])

  // Смена раздела двигает камеру: карта остаётся одна на всё приложение.
  useEffect(() => {
    if (!started) return
    whenReady(() => {
      const m = getMap()!
      if (section === 'route') return
      const cam = CAMERA[section]
      m.flyTo({ center: CENTER, ...cam, padding: padding(), duration: reduced() ? 0 : 1700, curve: 1.2, essential: true })
    })
  }, [section, started])

  useEffect(() => {
    whenReady(() => {
      ring.current?.remove()
      ring.current = null
      if (!selected) return
      const el = document.createElement('div')
      el.className = 'ring'
      ring.current = new maplibregl.Marker({ element: el }).setLngLat([selected.lon, selected.lat]).addTo(getMap()!)
      flyToPoint(selected, useApp.getState().section === 'growth' ? 12.9 : 14, useApp.getState().section === 'growth')
    })
  }, [selected])

  useEffect(() => {
    whenReady(() => {
      baseMarker.current?.remove()
      baseMarker.current = null
      if (!base) return
      const el = document.createElement('div')
      el.className = 'base-pin'
      el.textContent = 'Кухня'
      baseMarker.current = new maplibregl.Marker({ element: el }).setLngLat([base.lon, base.lat]).addTo(getMap()!)
    })
  }, [base])

  useEffect(() => {
    box.current?.classList.toggle('is-picking', pickingBase)
  }, [pickingBase])

  return <div ref={box} className="map" aria-label="Карта Бишкека" />
}

export { fitPoints }
