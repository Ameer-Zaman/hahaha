/**
 * Clubs of the city — official entries only. Empty until the team confirms them.
 *
 * Shape:
 * {
 *   id: 'unique-slug',
 *   name: 'Club name',
 *   type: 'Nightclub',                  // short label shown on the card
 *   emblem: '/media/clubs/slug.png',     // optional logo for the card face
 * }
 *
 * While the list is empty the page deals one "to be announced" card per suit.
 */
export const clubs = []

/** The suits used for placeholder cards (and to decorate real clubs, in order). */
export const suits = [
  { id: 'spade', glyph: '♠', label: 'Spades', red: false },
  { id: 'heart', glyph: '♥', label: 'Hearts', red: true },
  { id: 'diamond', glyph: '♦', label: 'Diamonds', red: true },
  { id: 'club', glyph: '♣', label: 'Clubs', red: false },
]
