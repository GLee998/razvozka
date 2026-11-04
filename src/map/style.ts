import type { StyleSpecification } from 'maplibre-gl'

export const C = {
  land: '#DCE6CF',
  landDeep: '#D2DEC2',
  park: '#BFD6A6',
  water: '#9FD0E4',
  road: '#FBFCF4',
  roadEdge: '#C9D6B8',
  building: '#C6D3B4',
  ink: '#0D3B2E',
  tomato: '#E8401C',
  cobalt: '#2340D8',
  magenta: '#A3219A',
  teal: '#00866F',
  yolk: '#FFC629',
}

const name: any = ['coalesce', ['get', 'name:ru'], ['get', 'name']]
const w = (...stops: number[]): any => ['interpolate', ['exponential', 1.5], ['zoom'], ...stops]

// Своя тема поверх векторных тайлов OpenStreetMap, ключ не нужен.
export const mapStyle: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: { osm: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': C.land } },
    { id: 'landuse', type: 'fill', source: 'osm', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood']]], paint: { 'fill-color': C.landDeep, 'fill-opacity': 0.55 } },
    { id: 'park', type: 'fill', source: 'osm', 'source-layer': 'park', paint: { 'fill-color': C.park } },
    { id: 'cover', type: 'fill', source: 'osm', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'farmland']]], paint: { 'fill-color': C.park, 'fill-opacity': 0.55 } },
    { id: 'water', type: 'fill', source: 'osm', 'source-layer': 'water', paint: { 'fill-color': C.water } },
    { id: 'waterway', type: 'line', source: 'osm', 'source-layer': 'waterway', paint: { 'line-color': C.water, 'line-width': w(10, 0.6, 16, 3) } },
    { id: 'aeroway', type: 'line', source: 'osm', 'source-layer': 'aeroway', paint: { 'line-color': C.road, 'line-width': 2 } },
    { id: 'rail', type: 'line', source: 'osm', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'rail'], paint: { 'line-color': C.roadEdge, 'line-width': 1, 'line-dasharray': [3, 3] } },
    { id: 'road-minor', type: 'line', source: 'osm', 'source-layer': 'transportation', minzoom: 11.5, filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'track']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.road, 'line-width': w(12, 0.4, 14, 1.6, 18, 11), 'line-opacity': 0.85 } },
    { id: 'road-mid', type: 'line', source: 'osm', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['tertiary', 'secondary']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.road, 'line-width': w(10, 0.6, 14, 3.4, 18, 20) } },
    { id: 'road-main', type: 'line', source: 'osm', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['primary', 'trunk', 'motorway']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': w(9, 1, 14, 5.5, 18, 30) } },
    { id: 'building', type: 'fill-extrusion', source: 'osm', 'source-layer': 'building', minzoom: 14, paint: { 'fill-extrusion-color': C.building, 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 0.8 } },
    { id: 'road-label', type: 'symbol', source: 'osm', 'source-layer': 'transportation_name', minzoom: 13, layout: { 'symbol-placement': 'line', 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': 11 }, paint: { 'text-color': '#5D7361', 'text-halo-color': C.road, 'text-halo-width': 1.4 } },
    { id: 'place-label', type: 'symbol', source: 'osm', 'source-layer': 'place', filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter', 'village', 'town']]], minzoom: 10.5, maxzoom: 15, layout: { 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': 11.5, 'text-max-width': 7 }, paint: { 'text-color': '#55705C', 'text-halo-color': C.land, 'text-halo-width': 1.6 } },
  ],
}
