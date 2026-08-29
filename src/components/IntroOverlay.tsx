interface IntroOverlayProps {
  onEnter: () => void
}

export function IntroOverlay({ onEnter }: IntroOverlayProps) {
  return (
    <div className="intro-overlay" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="intro-noise" aria-hidden="true" />
      <div className="intro-inner">
        <p className="intro-kicker">RALLY · TERRITORIO · TIEMPO</p>
        <h1 id="intro-title" className="intro-title">Un tramo no es sólo una línea en el mapa.</h1>
        <div className="intro-copy">
          <p>Puede llover en una punta y estar seco en la otra.</p>
          <p>Un acceso puede cerrar mucho antes del primer auto.</p>
          <p>La segunda pasada puede encontrarse con un camino distinto.</p>
          <p>Y la información suele estar repartida entre mapas, pronósticos y comunicados.</p>
        </div>
        <p className="intro-thesis">Acá juntamos el tramo, el tiempo y el contexto en un solo lugar.</p>
        <button className="primary-cta intro-cta" type="button" onClick={onEnter}>
          VER RALLY CHILE 2026 <span aria-hidden="true">→</span>
        </button>
        <p className="intro-footnote">Datos con fuente · lo que todavía no sabemos queda pendiente.</p>
      </div>
    </div>
  )
}
