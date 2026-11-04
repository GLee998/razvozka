// Обёртка над 2GIS Places API: кэш на диске и счётчик запросов, чтобы не сжечь лимит.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const KEY = process.env.DGIS_KEY
if (!KEY) throw new Error('Задайте ключ в переменной окружения DGIS_KEY')
const CACHE = 'data-raw/cache'
mkdirSync(CACHE, { recursive: true })
const COUNTER = 'data-raw/requests.txt'
export const spent = () => (existsSync(COUNTER) ? +readFileSync(COUNTER, 'utf8') : 0)
export const BUDGET = 800
export const FIELDS = 'items.point,items.address,items.rubrics,items.adm_div,items.geometry.centroid,items.org,items.schedule,items.reviews'

export async function search(params) {
  const id = createHash('md5').update(JSON.stringify(params)).digest('hex')
  const file = `${CACHE}/${id}.json`
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
  if (spent() >= BUDGET) throw new Error(`Бюджет ${BUDGET} запросов исчерпан`)
  const u = new URL('https://catalog.api.2gis.com/3.0/items')
  for (const [k, v] of Object.entries({ fields: FIELDS, page_size: 10, ...params, key: KEY })) u.searchParams.set(k, v)
  const res = await fetch(u)
  const json = await res.json()
  writeFileSync(COUNTER, String(spent() + 1))
  if (json.meta?.code === 200 || json.meta?.code === 404) writeFileSync(file, JSON.stringify(json))
  else console.warn('2GIS', json.meta?.code, json.meta?.error?.message, JSON.stringify(params))
  await new Promise(r => setTimeout(r, 120))
  return json
}

export async function allPages(params, maxPages = 5) {
  const items = []
  let total = 0
  for (let page = 1; page <= maxPages; page++) {
    const j = await search({ ...params, page })
    const got = j.result?.items ?? []
    total = j.result?.total ?? total
    items.push(...got)
    if (got.length < 10 || items.length >= total) break
  }
  return { items, total }
}
