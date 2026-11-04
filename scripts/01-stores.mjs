import { writeFileSync } from 'node:fs'
import { allPages, spent } from './lib2gis.mjs'
const names = ['Колобок','Корзина','Зеленый','Коровка','Family Market','Hello Market','Каймак','Матрешка','Daily','Мурас','Гастроном','Добрый','Любимый','Любимый Ахунбаева','Жанар','Royal Market']
const out = {}
for (const n of names) {
  const { items, total } = await allPages({ q: `${n} магазин`, location: '74.59,42.87', type: 'branch' }, 2)
  out[n] = items.filter(i => i.adm_div?.some(d => d.type === 'city' && d.name === 'Бишкек'))
  console.log(`\n## ${n} total=${total}`)
  for (const i of out[n]) console.log(`  ${i.name} | ${i.address_name} | ${(i.rubrics||[]).map(r=>r.name).join(',')} | ${i.point?.lat},${i.point?.lon}`)
}
writeFileSync('data-raw/stores-candidates.json', JSON.stringify(out, null, 1))
console.log('spent', spent())
