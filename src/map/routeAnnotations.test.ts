import assert from 'node:assert/strict'
import test from 'node:test'
import type { RouteNode } from './environmentNodes.ts'
import {
  buildDirectionArrows,
  buildDistanceMarkers,
  selectRepresentativeNodes,
} from './routeAnnotations.ts'

const line = {
  type: 'LineString' as const,
  coordinates: [
    [-73.0, -37.0],
    [-72.7, -37.0],
  ] as [number, number][],
}

test('buildDistanceMarkers emits derived 5 km references but no marker at START or FINISH', () => {
  const markers = buildDistanceMarkers(line, 5)

  assert.ok(markers.length > 0)
  assert.equal(markers[0].label, 'KM 5')
  assert.equal(markers[0].distanceKm, 5)
  assert.ok(markers.every((marker) => marker.distanceKm > 0))
  assert.ok(markers.every((marker) => marker.distanceKm % 5 === 0))
})

test('buildDistanceMarkers returns no intermediate markers for a route shorter than spacing', () => {
  const shortLine = {
    type: 'LineString' as const,
    coordinates: [
      [-72.7, -37.0],
      [-72.69, -37.0],
    ] as [number, number][],
  }

  assert.deepEqual(buildDistanceMarkers(shortLine, 5), [])
})

test('buildDirectionArrows returns internal route anchors with finite bearings', () => {
  const arrows = buildDirectionArrows(line, 4)

  assert.equal(arrows.length, 4)
  assert.ok(arrows.every((arrow) => Number.isFinite(arrow.bearingDeg)))
  assert.ok(arrows.every((arrow) => arrow.coordinate[0] > -73 && arrow.coordinate[0] < -72.7))
})

test('selectRepresentativeNodes keeps a balanced five-node view instead of labelling every analytical node', () => {
  const nodes: RouteNode[] = Array.from({ length: 11 }, (_, index) => ({
    id: `n-${index}`,
    role: index === 0 ? 'start' : index === 10 ? 'finish' : 'context',
    distanceKm: index * 2.5,
    coordinate: [-72.7 + index * 0.01, -37] as [number, number],
  }))

  const selected = selectRepresentativeNodes(nodes, 5)

  assert.equal(selected.length, 5)
  assert.equal(selected[0].role, 'start')
  assert.equal(selected.at(-1)?.role, 'finish')
  assert.deepEqual(selected.map((node) => node.distanceKm), [0, 5, 12.5, 20, 25])
})

test('selectRepresentativeNodes reduces density deterministically for small node sets', () => {
  const nodes: RouteNode[] = [
    { id: 'start', role: 'start', distanceKm: 0, coordinate: [-72.7, -37] },
    { id: 'middle', role: 'context', distanceKm: 2.5, coordinate: [-72.68, -37] },
    { id: 'finish', role: 'finish', distanceKm: 5, coordinate: [-72.66, -37] },
  ]

  assert.deepEqual(selectRepresentativeNodes(nodes, 5).map((node) => node.id), ['start', 'middle', 'finish'])
})
