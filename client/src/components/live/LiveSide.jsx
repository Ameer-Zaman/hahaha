/** One side of a live match: the gang's emblem (or initial) and name, in its colour. */
export default function LiveSide({ side }) {
  return (
    <span className="live__side" style={side.color ? { '--side': side.color } : undefined}>
      {side.emblem ? (
        <img className="live__emblem" src={side.emblem} alt="" loading="lazy" />
      ) : (
        <span className="live__emblem live__emblem--initial" aria-hidden="true">
          {side.name.slice(0, 1)}
        </span>
      )}
      <span className="live__name">{side.name}</span>
    </span>
  )
}
