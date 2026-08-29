import assert from 'node:assert/strict'
import test from 'node:test'
import { parseAppRoute, stageHash, stageShareUrl } from './stageRoute.ts'

test('parseAppRoute returns rally overview for an empty hash', () => {
  assert.deepEqual(parseAppRoute(''), { kind: 'overview' })
})

test('parseAppRoute resolves a shareable stage hash', () => {
  assert.deepEqual(parseAppRoute('#/chile-2026/ss1-turquia'), {
    kind: 'stage',
    eventId: 'chile-2026',
    stageSlug: 'ss1-turquia',
  })
})

test('parseAppRoute preserves an unknown route notice while returning to overview', () => {
  assert.deepEqual(parseAppRoute('#/chile-2026/not-a-real-stage/extra'), {
    kind: 'overview',
    notice: 'Stage link not found',
  })
})

test('stageHash and stageShareUrl generate the canonical static-host-safe link', () => {
  assert.equal(stageHash('chile-2026', 'ss1-turquia'), '#/chile-2026/ss1-turquia')
  assert.equal(
    stageShareUrl('https://example.com', '/rally-stage-sim/', 'chile-2026', 'ss1-turquia'),
    'https://example.com/rally-stage-sim/#/chile-2026/ss1-turquia',
  )
})
