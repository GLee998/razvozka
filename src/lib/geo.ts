import raw from '../data/geo.json'

export type Point = { lat: number; lon: number }
export type StorePoint = Point & { id: string; a: string; d: string | null; t: string }
export type Store = { key: string; name: string; pts: StorePoint[] }
export type Super = Point & { id: string; n: string; a: string; d: string | null; c: string | null }
export type BC = Point & { id: string; n: string; a: string; d: string | null }
export type JK = Point & { id: string; n: string; a: string; d: string | null; built: boolean; b: number }

export const DATA = raw as unknown as {
  meta: { fetched: string; excludedBig: Record<string, number>; counts: Record<string, number> }
  stores: Store[]
  super: Super[]
  bc: BC[]
  jk: JK[]
  housing: [number, number, number][]
}

export const CENTER: [number, number] = [74.595, 42.862]

const R = 6371000
const rad = (d: number) => (d * Math.PI) / 180

export function meters(a: Point, b: Point) {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function nearest<T extends Point>(p: Point, list: T[]) {
  let best: T | null = null
  let d = Infinity
  for (const q of list) {
    const m = meters(p, q)
    if (m < d) {
      d = m
      best = q
    }
  }
  return { item: best, d }
}

export const within = <T extends Point>(p: Point, list: T[], radius: number) => list.filter(q => meters(p, q) <= radius)

export function circle(p: Point, radius: number, steps = 48): [number, number][] {
  const out: [number, number][] = []
  const dLat = radius / 111320
  const dLon = radius / (111320 * Math.cos(rad(p.lat)))
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    out.push([p.lon + dLon * Math.cos(t), p.lat + dLat * Math.sin(t)])
  }
  return out
}

export const fmtDist = (m: number) => (m < 950 ? `${Math.round(m / 10) * 10} м` : `${(m / 1000).toFixed(1).replace('.', ',')} км`)

export const plural = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  return b === 1 ? one : many
}
