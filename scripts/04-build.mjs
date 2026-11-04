// Собирает итоговый src/data/geo.json из сырых выгрузок.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
const read = f => JSON.parse(readFileSync(`data-raw/${f}.json`, 'utf8'))
const round = n => Math.round(n * 1e5) / 1e5
const clean = s => (s ?? '').replace(/​/g, '').trim()
const district = i => i.adm_div?.find(d => d.type === 'district')?.name?.replace(' район', '') ?? null
const inCity = i => i.point && i.adm_div?.some(d => d.type === 'city' && d.name === 'Бишкек')

// Первый адрес каждой строки считаем основным: выбор сделан по центральности, в приложении его можно поменять.
const PICK = {
  'Колобок': ['Токтогула, 90а', '5-й микрорайон, 9/1', 'Тоголок Молдо, 364а'],
  'Корзина': ['Сыдыкова, 139', 'Жусупа Абдрахманова, 560'],
  'Зеленый': ['Турусбекова, 52/1'],
  'Коровка': ['Московская улица, 156'],
  'Family Market': ['Арстанбека Дуйшеева, 8', 'Жилгородок Совмина, 7/1'],
  'Hello Market': ['Жоомарта Боконбаева, 109', 'Куттубаева, 19'],
  'Каймак': ['Исхака Раззакова, 2', 'Гагарина, 55/2', 'Ак-Кайын, 45/1', 'Уметалиева, 124', 'Абдумомунова, 255', 'Арстанбека Дуйшеева, 12'],
  'Матрешка': ['Насирдина Исанова, 41'],
  'Daily': ['Жоомарта Боконбаева, 113', 'Насирдина Исанова, 117', 'Чынгыза Айтматова, 299/4', 'Курчатова, 81'],
  'Мурас': ['Байтик баатыра, 53/1', 'Аламедин-1, 79/1'],
  'Гастроном': ['Тоголок Молдо, 8', 'Жоомарта Боконбаева, 101'],
  'Добрый': ['Исы Ахунбаева, 110/3', '5-й микрорайон, 72м'],
  'Любимый': ['Чокморова, 205', 'Победы, 69/1', '8-й микрорайон, 10/3', 'Юбилейная улица, 29в', 'Асанбай, 11'],
  'Любимый Ахунбаева': ['Исы Ахунбаева, 186'],
  'Жанар': ['Жоомарта Боконбаева, 98', 'Ломоносова, 168а'],
  'Royal Market': ['Орозбекова, 19'],
}
const cands = read('stores-candidates')
const point = i => ({ id: i.id, lat: round(i.point.lat), lon: round(i.point.lon), a: clean(i.address_name), d: district(i), t: clean(i.name) })
const stores = Object.entries(PICK).map(([name, addrs], idx) => {
  const pool = [...(cands[name] ?? []), ...(cands['Гастроном'] ?? [])].filter(i => i.point)
  const pts = addrs.map(a => {
    const hit = pool.find(i => clean(i.address_name).includes(a))
    if (!hit) throw new Error(`${name}: нет адреса ${a}`)
    return point(hit)
  })
  return { key: `s${idx + 1}`, name, pts }
})

// Крупные сети и всё, что не про розницу рядом с домом.
const BIG = /^(globus|азия|народный|bimar|spar|достор|евразия)(?=[\s,]|$)/i
const NOT_RETAIL = /оптов|склад|гипермаркет|столовая|премиум/i
const raw = read('supermarkets').filter(inCity)
const excludedBig = {}
const chainOf = new Map(stores.flatMap(s => s.pts.map(p => [p.id, s.name])))
const seen = new Map()
for (const i of raw) {
  const n = clean(i.name)
  const m = n.match(BIG)
  if (m) { const k = m[1].toLowerCase(); excludedBig[k] = (excludedBig[k] || 0) + 1; continue }
  if (NOT_RETAIL.test(n)) continue
  seen.set(i.id, { id: i.id, n, a: clean(i.address_name), lat: round(i.point.lat), lon: round(i.point.lon), d: district(i), c: chainOf.get(i.id) ?? null })
}
for (const s of stores) for (const p of s.pts) if (!seen.has(p.id)) seen.set(p.id, { id: p.id, n: p.t, a: p.a, lat: p.lat, lon: p.lon, d: p.d, c: s.name })

const bc = read('bc').filter(inCity).map(i => ({ id: i.id, n: clean(i.name).replace(/,\s*бизнес-центр$/i, ''), a: clean(i.address_name), lat: round(i.point.lat), lon: round(i.point.lon), d: district(i) }))

// Один комплекс в 2GIS часто разбит на корпуса: собираем их по имени и близости.
const dist = (a, b) => { const k = 111320; return Math.hypot((a.lat - b.lat) * k, (a.lon - b.lon) * k * Math.cos(a.lat * Math.PI / 180)) }
const jkRaw = read('jk').filter(i => i.point && /жил(ой|ые)\s+(комплекс|массив)/i.test(i.name))
  .filter(i => i.point.lat > 42.78 && i.point.lat < 42.95 && i.point.lon > 74.46 && i.point.lon < 74.72)
const jk = []
for (const i of jkRaw) {
  const full = clean(i.name)
  const short = full.replace(/,?\s*(многофункциональный\s+)?(строящийся\s+)?(клубный\s+)?жилой\s+(комплекс|массив)(\s+бизнес-класса)?/ig, '').replace(/^жилой комплекс\s*/i, '').trim() || full
  const built = !/строящ/i.test(full)
  const p = { lat: i.point.lat, lon: i.point.lon }
  const same = jk.find(j => j.n.toLowerCase() === short.toLowerCase() && dist(j, p) < 600)
  if (same) { same.lat = round((same.lat * same.b + p.lat) / (same.b + 1)); same.lon = round((same.lon * same.b + p.lon) / (same.b + 1)); same.b++; same.built = same.built && built; continue }
  jk.push({ id: i.id, n: short, a: clean(i.address_name), lat: round(p.lat), lon: round(p.lon), d: district(i), built, b: 1 })
}

const housing = existsSync('data-raw/osm-housing.json')
  ? read('osm-housing').filter(h => h.b !== 'residential' || h.levels >= 3).map(h => [round(h.lat), round(h.lon), h.levels ?? 0])
  : []

mkdirSync('src/data', { recursive: true })
const out = {
  meta: { fetched: new Date().toISOString().slice(0, 10), excludedBig, counts: { stores: stores.length, super: seen.size, bc: bc.length, jk: jk.length, jkBuilt: jk.filter(j => j.built).length, housing: housing.length } },
  stores, super: [...seen.values()], bc, jk, housing,
}
writeFileSync('src/data/geo.json', JSON.stringify(out))
console.log(out.meta, stores.map(s => `${s.name}:${s.pts.length}`).join(' '))
