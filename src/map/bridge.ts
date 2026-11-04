import type * as GeoJSON from 'geojson'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl'
import type { Point } from '../lib/geo'

let map: MLMap | null = null
let ready = false
const queue: (() => void)[] = []

export const reduced = () => {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
export function attachMap(m: MLMap) {
  map = m
}
export function markReady() {
  ready = true
  queue.splice(0).forEach(f => f())
}
export function whenReady(fn: () => void) {
  if (ready && map) fn()
  else queue.push(fn)
}
export const getMap = () => map
export const setData = (id: string, data: GeoJSON.GeoJSON) => whenReady(() => (map!.getSource(id) as GeoJSONSource | undefined)?.setData(data))
export const setVisible = (id: string, on: boolean) => whenReady(() => map!.getLayer(id) && map!.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'))

export const isMobile = () => innerWidth < 860
export const padding = (extra = 0) =>
  isMobile()
    ? { left: 16, right: 16, top: 70, bottom: Math.round(innerHeight * 0.5) }
    : { left: Math.min(460, innerWidth * 0.5) + extra, right: 40, top: 80, bottom: 40 }

export function flyToPoint(p: Point, zoom = 15) {
  whenReady(() =>
    map!.flyTo({ center: [p.lon, p.lat], zoom: Math.max(map!.getZoom(), zoom), padding: padding(), duration: reduced() ? 0 : 1100, essential: true }),
  )
}
export function fitPoints(pts: Point[], opts: { pitch?: number; bearing?: number; maxZoom?: number } = {}) {
  whenReady(() => {
    if (!pts.length) return
    const b = new maplibregl.LngLatBounds()
    pts.forEach(p => b.extend([p.lon, p.lat]))
    map!.fitBounds(b, { padding: padding(), pitch: opts.pitch ?? 0, bearing: opts.bearing ?? 0, maxZoom: opts.maxZoom ?? 14, duration: reduced() ? 0 : 1400 })
  })
}

let raf = 0
let van: maplibregl.Marker | null = null
const lineFC = (c: [number, number][]): GeoJSON.Feature => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: c } })

export function stopRoute() {
  cancelAnimationFrame(raf)
  van?.remove()
  van = null
}
export function clearRoute() {
  stopRoute()
  setData('route', lineFC([]))
  setData('route-ghost', lineFC([]))
}

// Линия маршрута растёт вместе с движением машины, скорость постоянная по всей длине.
export function playRoute(coords: [number, number][], onDone?: () => void) {
  whenReady(() => {
    stopRoute()
    setData('route-ghost', lineFC(coords))
    if (reduced() || coords.length < 2) {
      setData('route', lineFC(coords))
      onDone?.()
      return
    }
    const seg: number[] = [0]
    for (let i = 1; i < coords.length; i++) {
      const [a, b] = [coords[i - 1], coords[i]]
      seg.push(seg[i - 1] + Math.hypot((b[0] - a[0]) * 0.73, b[1] - a[1]))
    }
    const total = seg[seg.length - 1]
    const el = document.createElement('div')
    el.className = 'van'
    el.innerHTML = '<span></span>'
    van = new maplibregl.Marker({ element: el }).setLngLat(coords[0]).addTo(map!)
    const dur = Math.min(9000, Math.max(3500, coords.length * 6))
    const start = performance.now()
    let idx = 1
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      const d = eased * total
      while (idx < seg.length - 1 && seg[idx] < d) idx++
      const k = (d - seg[idx - 1]) / (seg[idx] - seg[idx - 1] || 1)
      const p: [number, number] = [coords[idx - 1][0] + (coords[idx][0] - coords[idx - 1][0]) * k, coords[idx - 1][1] + (coords[idx][1] - coords[idx - 1][1]) * k]
      setData('route', lineFC([...coords.slice(0, idx), p]))
      van?.setLngLat(p)
      if (t < 1) raf = requestAnimationFrame(tick)
      else {
        stopRoute()
        onDone?.()
      }
    }
    raf = requestAnimationFrame(tick)
  })
}

let hexRaf = 0
export function growHexes(show: boolean) {
  whenReady(() => {
    cancelAnimationFrame(hexRaf)
    const layer = 'hex'
    const m = map!
    if (!m.getLayer(layer)) return
    const paint = (s: number) => m.setPaintProperty(layer, 'fill-extrusion-height', ['*', ['get', 'v'], 1500 * s])
    if (show) m.setLayoutProperty(layer, 'visibility', 'visible')
    if (reduced()) {
      paint(show ? 1 : 0)
      if (!show) m.setLayoutProperty(layer, 'visibility', 'none')
      return
    }
    const start = performance.now()
    const dur = show ? 1200 : 450
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const e = 1 - (1 - t) ** 4
      paint(show ? e : 1 - e)
      if (t < 1) hexRaf = requestAnimationFrame(tick)
      else if (!show) m.setLayoutProperty(layer, 'visibility', 'none')
    }
    hexRaf = requestAnimationFrame(tick)
  })
}
