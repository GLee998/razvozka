import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DATA, type StorePoint } from './geo'
import { optimize } from './route'

export type Section = 'city' | 'growth' | 'points' | 'route' | 'menu'
export type Focus = 'office' | 'balance' | 'home'
export type Selected = { kind: 'store' | 'super' | 'bc' | 'jk'; id: string; lat: number; lon: number } | null

const safeStorage = createJSONStorage(() => {
  try {
    const t = '__t'
    localStorage.setItem(t, t)
    localStorage.removeItem(t)
    return localStorage
  } catch {
    const mem = new Map<string, string>()
    return { getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: k => void mem.delete(k) }
  }
})

type State = {
  section: Section
  setSection: (s: Section) => void
  layers: { stores: boolean; super: boolean; bc: boolean; jk: boolean; jkPlanned: boolean; cover: boolean }
  toggleLayer: (k: keyof State['layers']) => void
  radius: number
  setRadius: (r: number) => void
  focus: Focus
  setFocus: (f: Focus) => void
  selected: Selected
  select: (s: Selected) => void
  branch: Record<string, string>
  setBranch: (storeKey: string, pointId: string) => void
  confirmed: Record<string, boolean>
  confirm: (storeKey: string) => void
  shortlist: string[]
  toggleShortlist: (id: string) => void
  matrix: Record<string, boolean>
  toggleCell: (storeKey: string, pos: number) => void
  setMany: (keys: string[], v: boolean) => void
  stops: string[]
  setStops: (s: string[]) => void
  base: { lat: number; lon: number } | null
  setBase: (b: State['base']) => void
  pickingBase: boolean
  setPickingBase: (v: boolean) => void
}

export const useApp = create<State>()(
  persist(
    set => ({
      section: 'city',
      setSection: section => set({ section, selected: null, pickingBase: false }),
      layers: { stores: true, super: false, bc: true, jk: true, jkPlanned: false, cover: false },
      toggleLayer: k => set(s => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
      radius: 500,
      setRadius: radius => set({ radius }),
      focus: 'balance',
      setFocus: focus => set({ focus }),
      selected: null,
      select: selected => set({ selected }),
      branch: {},
      setBranch: (k, id) => set(s => ({ branch: { ...s.branch, [k]: id }, confirmed: { ...s.confirmed, [k]: true } })),
      confirmed: {},
      confirm: k => set(s => ({ confirmed: { ...s.confirmed, [k]: !s.confirmed[k] } })),
      shortlist: [],
      toggleShortlist: id =>
        set(s => ({ shortlist: s.shortlist.includes(id) ? s.shortlist.filter(x => x !== id) : [...s.shortlist, id] })),
      matrix: {},
      toggleCell: (k, p) => set(s => ({ matrix: { ...s.matrix, [`${k}:${p}`]: !s.matrix[`${k}:${p}`] } })),
      setMany: (keys, v) =>
        set(s => {
          const m = { ...s.matrix }
          keys.forEach(k => (m[k] = v))
          return { matrix: m }
        }),
      stops: optimize(activePoints({}), null).map(s => s.key),
      setStops: stops => set({ stops }),
      base: null,
      setBase: base => set({ base }),
      pickingBase: false,
      setPickingBase: pickingBase => set({ pickingBase }),
    }),
    {
      name: 'razvozka-v1',
      storage: safeStorage,
      partialize: s => ({
        layers: s.layers,
        radius: s.radius,
        focus: s.focus,
        branch: s.branch,
        confirmed: s.confirmed,
        shortlist: s.shortlist,
        matrix: s.matrix,
        stops: s.stops,
        base: s.base,
      }),
    },
  ),
)

export function activePoints(branch: Record<string, string>) {
  return DATA.stores.map(s => {
    const p: StorePoint = s.pts.find(x => x.id === branch[s.key]) ?? s.pts[0]
    return { ...p, key: s.key, name: s.name, options: s.pts.length }
  })
}
export type ActivePoint = ReturnType<typeof activePoints>[number]

export function useActivePoints() {
  const branch = useApp(s => s.branch)
  return activeMemo(branch)
}
let lastBranch: unknown
let lastPts: ActivePoint[] = []
function activeMemo(branch: Record<string, string>) {
  if (branch !== lastBranch) {
    lastBranch = branch
    lastPts = activePoints(branch)
  }
  return lastPts
}
