import { latLngToCell, cellToBoundary } from 'h3-js'
import { DATA, meters, nearest, type Point, type Super } from './geo'
import type { ActivePoint, Focus } from './store'

// Веса отвечают на вопрос «кто покупает»: офисный обед или ужин дома.
export const WEIGHTS: Record<Focus, { bc: number; jk: number; house: number }> = {
  office: { bc: 3, jk: 0.5, house: 0.15 },
  balance: { bc: 1.5, jk: 1.5, house: 0.4 },
  home: { bc: 0.4, jk: 3, house: 0.8 },
}
const builtJK = DATA.jk.filter(j => j.built)
const floors = (l: number) => (l >= 9 ? 2 : l >= 5 ? 1.3 : 1)

export type Candidate = Super & {
  score: number
  bc: number
  jk: number
  house: number
  toUs: number
  nearestName: string
}

export function rankCandidates(active: ActivePoint[], focus: Focus, radius: number): Candidate[] {
  const w = WEIGHTS[focus]
  const ownIds = new Set(active.map(a => a.id))
  const rows = DATA.super
    .filter(s => !ownIds.has(s.id))
    .map(s => {
      const bc = DATA.bc.filter(b => meters(s, b) <= radius).length
      const jk = builtJK.filter(j => meters(s, j) <= radius).length
      let house = 0
      let houseWeight = 0
      for (const [lat, lon, l] of DATA.housing) {
        if (meters(s, { lat, lon }) <= radius) {
          house++
          houseWeight += floors(l)
        }
      }
      const near = nearest(s, active)
      const demand = w.bc * bc + w.jk * jk + w.house * houseWeight
      // Рядом с уже работающей точкой новый магазин даёт меньше: за 1,5 км разрыв считаем полным.
      const gap = Math.min(near.d, 1500) / 1500
      // Дальше 4 км от сети рейс становится дороже, поэтому такие магазины получают скидку к индексу.
      const far = Math.max(0.6, 1 - Math.max(0, near.d - 4000) / 8000)
      return { ...s, raw: demand * (0.35 + 0.65 * gap) * far, bc, jk, house, toUs: near.d, nearestName: near.item?.name ?? '' }
    })
  const top = Math.max(...rows.map(r => r.raw), 1)
  return rows
    .map(({ raw, ...r }) => ({ ...r, score: Math.round((raw / top) * 100) }))
    .sort((a, b) => b.score - a.score || a.toUs - b.toUs)
}

export function coverage(active: ActivePoint[], radius: number) {
  const hit = (p: Point) => active.some(a => meters(p, a) <= radius)
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
  const own = new Set(active.map(a => a.id))
  const bc = DATA.bc.filter(hit).length
  const jk = builtJK.filter(hit).length
  const others = DATA.super.filter(s => !own.has(s.id))
  const sup = others.filter(hit).length
  const house = DATA.housing.filter(([lat, lon]) => hit({ lat, lon })).length
  return {
    bc: { n: bc, of: DATA.bc.length, pct: pct(bc, DATA.bc.length) },
    jk: { n: jk, of: builtJK.length, pct: pct(jk, builtJK.length) },
    house: { n: house, of: DATA.housing.length, pct: pct(house, DATA.housing.length) },
    sup: { n: sup, of: others.length, pct: pct(sup, others.length) },
  }
}

export const DISTRICTS = ['Первомайский', 'Ленинский', 'Октябрьский', 'Свердловский']

export function byDistrict(active: ActivePoint[]) {
  const own = new Set(active.map(a => a.id))
  return DISTRICTS.map(d => ({
    d,
    ours: active.filter(a => a.d === d).length,
    sup: DATA.super.filter(s => s.d === d && !own.has(s.id)).length,
    bc: DATA.bc.filter(s => s.d === d).length,
    jk: builtJK.filter(s => s.d === d).length,
  }))
}

// Шестиугольники спроса для объёмного слоя на карте.
export function demandHexes(focus: Focus) {
  const w = WEIGHTS[focus]
  const cells = new Map<string, number>()
  const add = (lat: number, lon: number, v: number) => {
    const c = latLngToCell(lat, lon, 8)
    cells.set(c, (cells.get(c) ?? 0) + v)
  }
  DATA.bc.forEach(b => add(b.lat, b.lon, w.bc))
  builtJK.forEach(j => add(j.lat, j.lon, w.jk))
  DATA.housing.forEach(([lat, lon, l]) => add(lat, lon, w.house * floors(l)))
  const max = Math.max(...cells.values(), 1)
  return {
    type: 'FeatureCollection' as const,
    features: [...cells.entries()].map(([c, v]) => {
      const ring = cellToBoundary(c, true) as [number, number][]
      return {
        type: 'Feature' as const,
        properties: { v: v / max },
        geometry: { type: 'Polygon' as const, coordinates: [[...ring, ring[0]]] },
      }
    }),
  }
}
