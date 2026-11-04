import { meters, type Point } from './geo'

// Ближайший сосед и затем 2-opt: для 16 точек этого хватает с запасом.
export function optimize<T extends Point>(stops: T[], start: Point | null): T[] {
  if (stops.length < 3) return stops
  const left = [...stops]
  const order: T[] = []
  let cur: Point = start ?? left[0]
  while (left.length) {
    let bi = 0
    let bd = Infinity
    left.forEach((p, i) => {
      const d = meters(cur, p)
      if (d < bd) {
        bd = d
        bi = i
      }
    })
    cur = left[bi]
    order.push(left.splice(bi, 1)[0])
  }
  const len = (r: T[]) => r.reduce((sum, p, i) => sum + (i ? meters(r[i - 1], p) : start ? meters(start, p) : 0), 0)
  let improved = true
  let best = order
  let bestLen = len(order)
  while (improved) {
    improved = false
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const next = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)]
        const l = len(next)
        if (l < bestLen - 1) {
          best = next
          bestLen = l
          improved = true
        }
      }
    }
  }
  return best
}

export type RouteResult = {
  coords: [number, number][]
  km: number
  min: number
  roads: boolean
}

export async function roadRoute(points: Point[], signal?: AbortSignal): Promise<RouteResult> {
  const line = points.map(p => [p.lon, p.lat] as [number, number])
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${line.map(c => c.join(',')).join(';')}?overview=full&geometries=geojson`
    const res = await fetch(url, { signal })
    const j = await res.json()
    const r = j.routes?.[0]
    if (!r) throw new Error('нет маршрута')
    return { coords: r.geometry.coordinates, km: r.distance / 1000, min: r.duration / 60, roads: true }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    const m = points.reduce((s, p, i) => s + (i ? meters(points[i - 1], p) : 0), 0) * 1.3
    return { coords: line, km: m / 1000, min: (m / 1000 / 25) * 60, roads: false }
  }
}
