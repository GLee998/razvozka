# Развозка

Карта и управленческая панель для развозки готовой еды по Бишкеку: точки поставки, бизнес-центры, жилые комплексы, супермаркеты, поиск новых магазинов, маршрут и таблица меню.

## Запуск

```bash
npm install
npm run dev
```

## Обновление данных

Ключ 2ГИС нужен только этим скриптам и в код сайта не попадает. Скрипты кэшируют ответы и считают запросы в `data-raw/requests.txt`.

```bash
export DGIS_KEY=ваш_ключ
node scripts/01-stores.mjs
node scripts/02-layers.mjs bc
node scripts/02-layers.mjs jk
node scripts/02-layers.mjs supermarkets
node scripts/03-osm.mjs
node scripts/04-build.mjs
```

Основные адреса точек и список исключённых крупных сетей задаются в начале `scripts/04-build.mjs`.

## Как устроено

- Карта: MapLibre GL и векторные тайлы OpenFreeMap на данных OpenStreetMap со своей темой в `src/map/style.ts`.
- Интерфейс: React, Motion, NumberFlow, Zustand. Шестиугольники спроса считает h3-js.
- Маршрут: порядок считается в браузере, дороги берутся у открытого сервиса OSRM.
- Отметки пользователя хранятся в браузере. Базы данных пока нет.

Публикуется на GitHub Pages автоматически при пуше в `main`.
