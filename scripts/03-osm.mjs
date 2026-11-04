// Открытые данные OSM: многоквартирные дома и этажность, основа расчёта плотности жилья.
import { writeFileSync } from 'node:fs'
const q = `[out:json][timeout:120];(
 way["building"~"^(apartments|residential|dormitory)$"](42.78,74.46,42.95,74.72);
 relation["building"~"^(apartments|residential)$"](42.78,74.46,42.95,74.72);
);out center tags;`
for (const ep of ['https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter','https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter']) {
  const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'razvozka-data-script' }, signal: AbortSignal.timeout(40000) }).catch(e => ({ ok: false, status: e.name }))
  console.log(ep, r.status)
  if (!r.ok) continue
  const j = await r.json()
  const pts = j.elements.filter(e => e.center).map(e => ({ lat: e.center.lat, lon: e.center.lon, levels: +e.tags?.['building:levels'] || null, b: e.tags?.building, flats: +e.tags?.['building:flats'] || null }))
  writeFileSync('data-raw/osm-housing.json', JSON.stringify(pts))
  const c = {}; pts.forEach(p => (c[p.b] = (c[p.b] || 0) + 1))
  console.log(pts.length, c, 'with levels', pts.filter(p => p.levels).length, 'levels>=5', pts.filter(p=>p.levels>=5).length)
  break
}
