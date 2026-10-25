import { Router } from 'express'

import { validateBody } from '../../middleware/validate.js'
import { TdmBoard } from '../../models/TdmBoard.js'
import { audit } from '../../services/audit.js'
import { tdmBoardSchema } from '../../validation/schemas.js'

/** The TDM leaderboard (Panel → TDM leaderboard). */
const router = Router()

const getBoard = async () => (await TdmBoard.findOne({ key: 'main' })) ?? (await TdmBoard.create({ key: 'main' }))

router.get('/', async (req, res) => {
  const board = await getBoard()
  res.json({ season: board.season, players: board.players, updatedAt: board.updatedAt })
})

router.put('/', validateBody(tdmBoardSchema), async (req, res) => {
  const board = await getBoard()
  board.season = req.body.season
  board.players = req.body.players
  await board.save()
  await audit(req, 'tdm.update', 'leaderboard', `${board.players.length} players${board.season ? ` · ${board.season}` : ''}`)
  res.json({ season: board.season, players: board.players, updatedAt: board.updatedAt })
})

export default router
