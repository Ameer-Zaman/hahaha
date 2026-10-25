/**
 * Leaderboard ranking rules (kept in one place so the page and the panel agree).
 *
 * TDM  — per player: most kills, then best K/D, then most wins, then name.
 * War  — per gang, from the war records: most wins, then best win rate, then fewest losses,
 *        then most wars played, then name. Win rate counts draws as played, not won.
 * Players / gangs with identical stats share a rank (1, 2, 2, 4 …).
 */

export const kd = (kills, deaths) => (deaths > 0 ? kills / deaths : kills)
export const formatKd = (kills, deaths) => kd(kills, deaths).toFixed(2)

function withRanks(list, compare, sameKey) {
  const sorted = [...list].sort(compare)
  let rank = 0
  let prev = null
  return sorted.map((item, index) => {
    const key = sameKey(item)
    if (key !== prev) rank = index + 1
    prev = key
    return { ...item, rank }
  })
}

export function rankTdm(players = []) {
  const rows = players
    .filter((p) => p && p.name)
    .map((p) => ({
      name: p.name,
      kills: Number(p.kills) || 0,
      deaths: Number(p.deaths) || 0,
      wins: Number(p.wins) || 0,
      matches: Number(p.matches) || 0,
    }))
    .map((p) => ({ ...p, ratio: kd(p.kills, p.deaths) }))
  return withRanks(
    rows,
    (a, b) => b.kills - a.kills || b.ratio - a.ratio || b.wins - a.wins || a.name.localeCompare(b.name),
    (p) => `${p.kills}|${p.ratio.toFixed(4)}|${p.wins}`,
  )
}

/** Gang standings from the gang files (each has `record.wars` from that gang's side). */
export function rankWars(files = []) {
  const rows = files
    .filter((f) => !f.reserved && f.record?.wars?.length > 0)
    .map((f) => {
      const { wins, losses, draws, wars } = f.record
      const played = wars.length
      return {
        slug: f.slug,
        name: f.title,
        emblem: f.emblem,
        demo: f.demo,
        played,
        wins,
        losses,
        draws,
        winRate: played ? wins / played : 0,
        // newest last, so the row reads left → right in time
        form: wars.slice(0, 5).map((w) => w.outcome).reverse(),
        last: wars[0] ?? null,
      }
    })
  return withRanks(
    rows,
    (a, b) => b.wins - a.wins || b.winRate - a.winRate || a.losses - b.losses || b.played - a.played || a.name.localeCompare(b.name),
    (g) => `${g.wins}|${g.winRate.toFixed(4)}|${g.losses}|${g.played}`,
  )
}
