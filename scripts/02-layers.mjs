import { writeFileSync, readFileSync } from 'node:fs'
import { allPages, search, spent } from './lib2gis.mjs'
const cands = JSON.parse(readFileSync('data-raw/stores-candidates.json','utf8'))
const rub = {}; for (const l of Object.values(cands)) for (const i of l) for (const r of i.rubrics||[]) rub[r.name]=r.id
const PROD = rub['Продуктовые магазины'], SUPER = rub['Супермаркеты']
console.log({PROD,SUPER})
const BBOX = { w: 74.46, e: 74.72, s: 42.78, n: 42.95 }

async function quad(params, box, depth = 0, acc = new Map()) {
  const p = { ...params, point1: `${box.w},${box.n}`, point2: `${box.e},${box.s}` }
  const first = await search({ ...p, page: 1 })
  const total = first.result?.total ?? 0
  if (first.meta?.code !== 200 && first.meta?.code !== 404) console.warn('fail', first.meta)
  if (total > 50 && depth < 6) {
    const mx = (box.w + box.e) / 2, my = (box.s + box.n) / 2
    for (const b of [{w:box.w,e:mx,s:my,n:box.n},{w:mx,e:box.e,s:my,n:box.n},{w:box.w,e:mx,s:box.s,n:my},{w:mx,e:box.e,s:box.s,n:my}]) await quad(params, b, depth + 1, acc)
  } else {
    const { items } = await allPages(p)
    for (const i of items) acc.set(i.id, i)
  }
  return acc
}
const which = process.argv[2]
const jobs = {
  bc: [{ rubric_id: 13796 }],
  supermarkets: [{ rubric_id: SUPER }],
  jk: [{ q: 'жилой комплекс', type: 'branch,adm_div.living_area,adm_div.place,building' }, { rubric_id: 603 }],
}
for (const params of jobs[which]) {
  const m = await quad(params, BBOX)
  const f = `data-raw/${which}.json`
  let prev = []; try { prev = JSON.parse(readFileSync(f,'utf8')) } catch {}
  const all = new Map([...prev.map(i=>[i.id,i]), ...m])
  writeFileSync(f, JSON.stringify([...all.values()]))
  console.log(which, JSON.stringify(params), 'got', m.size, 'all', all.size, 'spent', spent())
}
