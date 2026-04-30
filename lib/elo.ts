const K_FACTOR = 32

/**
 * Calculate expected score for player A against player B
 * Expected score = 1 / (1 + 10^((ratingB - ratingA) / 400))
 */
export function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * Calculate new ELO rating
 * New rating = old rating + K × (actual result − expected score)
 * Actual result = 1 for winner, 0 for loser
 */
export function calculateNewRating(
  currentRating: number,
  expectedScore: number,
  won: boolean
): number {
  const actualScore = won ? 1 : 0
  return Math.round(currentRating + K_FACTOR * (actualScore - expectedScore))
}

/**
 * Calculate ELO changes for a match
 * Returns the new ratings for both players
 */
export function calculateMatchElo(
  player1Elo: number,
  player2Elo: number,
  player1Won: boolean
): { newPlayer1Elo: number; newPlayer2Elo: number } {
  const expectedP1 = calculateExpectedScore(player1Elo, player2Elo)
  const expectedP2 = calculateExpectedScore(player2Elo, player1Elo)

  const newPlayer1Elo = calculateNewRating(player1Elo, expectedP1, player1Won)
  const newPlayer2Elo = calculateNewRating(player2Elo, expectedP2, !player1Won)

  return { newPlayer1Elo, newPlayer2Elo }
}
