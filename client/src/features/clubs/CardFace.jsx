/** The face of a club card: corner indices, the suit, and the club (or "to be announced"). */
export default function CardFace({ club, suit, number }) {
  const index = String(number).padStart(2, '0')
  return (
    <div className={`club-face ${suit.red ? 'is-red' : ''}`}>
      <div className="club-face__frame" aria-hidden="true" />
      <span className="club-face__corner club-face__corner--tl" aria-hidden="true">
        <b>{index}</b>
        <i>{suit.glyph}</i>
      </span>
      <span className="club-face__corner club-face__corner--br" aria-hidden="true">
        <b>{index}</b>
        <i>{suit.glyph}</i>
      </span>
      <div className="club-face__body">
        {club?.emblem ? (
          <img className="club-face__emblem" src={club.emblem} alt="" loading="lazy" />
        ) : (
          <span className="club-face__suit" aria-hidden="true">
            {suit.glyph}
          </span>
        )}
        <p className="club-face__type">{club?.type ?? suit.label}</p>
        <h3 className="club-face__name">{club?.name ?? `Club ${index}`}</h3>
        {(club?.owner || club?.location) && (
          <p className="club-face__meta">{[club.owner && `Owner · ${club.owner}`, club.location].filter(Boolean).join('  ·  ')}</p>
        )}
        {!club && <p className="club-face__soon">To be announced</p>}
      </div>
    </div>
  )
}
