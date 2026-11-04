import { motion } from 'motion/react'
import { DATA } from '../lib/geo'
import { MENU } from '../data/menu'
import { useApp } from '../lib/store'
import { Note } from '../ui/bits'

export function MenuGrid() {
  const matrix = useApp(s => s.matrix)
  const toggle = useApp(s => s.toggleCell)
  const setMany = useApp(s => s.setMany)
  const stores = DATA.stores
  const filled = Object.values(matrix).filter(Boolean).length
  const has = (k: string, p: number) => !!matrix[`${k}:${p}`]

  const exportCsv = () => {
    const rows = [['Позиция', ...stores.map(s => s.name)], ...MENU.map((m, p) => [m, ...stores.map(s => (has(s.key, p) ? 'да' : ''))])]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
    a.download = 'menu-po-tochkam.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <div className="menu-head">
        <div>
          <h2 className="hero">Что куда едет</h2>
          <p className="lede">
            {filled === 0
              ? 'Пока ничего не отмечено. Нажмите на клетку, если блюдо есть в магазине, или на название, чтобы отметить весь ряд.'
              : `Отмечено ${filled} из ${MENU.length * stores.length} сочетаний.`}
          </p>
        </div>
        {filled > 0 && <button className="primary" onClick={exportCsv}>Скачать таблицу</button>}
      </div>
      <div className="grid-wrap" tabIndex={0} role="region" aria-label="Таблица блюд и магазинов">
        <table className="grid">
          <thead>
            <tr>
              <th scope="col" className="corner">Блюдо</th>
              {stores.map(s => (
                <th key={s.key} scope="col" className="vert">
                  <button onClick={() => {
                    const keys = MENU.map((_, p) => `${s.key}:${p}`)
                    setMany(keys, !keys.every(k => matrix[k]))
                  }}><span>{s.name}</span></button>
                </th>
              ))}
              <th scope="col" className="sum">Точек</th>
            </tr>
          </thead>
          <tbody>
            {MENU.map((m, p) => {
              const n = stores.filter(s => has(s.key, p)).length
              return (
                <tr key={m}>
                  <th scope="row">
                    <button onClick={() => {
                      const keys = stores.map(s => `${s.key}:${p}`)
                      setMany(keys, !keys.every(k => matrix[k]))
                    }}>{m}</button>
                  </th>
                  {stores.map(s => {
                    const on = has(s.key, p)
                    return (
                      <td key={s.key}>
                        <button className="cell" aria-pressed={on} aria-label={`${m} в ${s.name}`} onClick={() => toggle(s.key, p)}>
                          {on && <motion.i initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 22 }} />}
                        </button>
                      </td>
                    )
                  })}
                  <td className="sum">{n || ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Note>Отметки хранятся только в этом браузере. Чтобы их видела вся команда, нужно подключить общую базу данных.</Note>
    </>
  )
}
