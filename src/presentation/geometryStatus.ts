import type { StageGeometryStatus } from '../domain/rally.ts'

export function describeGeometryStatus(status: StageGeometryStatus, hasGeometry: boolean): string {
  if (!hasGeometry) return 'Geometría pendiente de verificación — no se dibuja una ruta sintética'
  if (status === 'verified') return 'Geometría verificada disponible'
  return 'Reconstrucción de referencia — no GPS oficial; consultá la provenance del tramo'
}
