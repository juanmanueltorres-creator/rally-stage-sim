export type AppRoute =
  | { kind: 'overview'; notice?: string }
  | { kind: 'stage'; eventId: string; stageSlug: string }

export function parseAppRoute(hash: string): AppRoute {
  const normalized = hash.replace(/^#/, '')
  if (!normalized || normalized === '/') return { kind: 'overview' }

  const parts = normalized.split('/').filter(Boolean)
  if (parts.length === 2) {
    return {
      kind: 'stage',
      eventId: parts[0],
      stageSlug: parts[1],
    }
  }

  return { kind: 'overview', notice: 'Stage link not found' }
}

export function stageHash(eventId: string, slug: string): string {
  return `#/${eventId}/${slug}`
}

export function stageShareUrl(
  origin: string,
  pathname: string,
  eventId: string,
  slug: string,
): string {
  const normalizedPath = pathname.endsWith('/') ? pathname : `${pathname}/`
  return `${origin}${normalizedPath}${stageHash(eventId, slug)}`
}
