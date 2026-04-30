export interface Player {
  id: string
  name: string
  elo: number
  wins: number
  losses: number
  created_at: string
}

export interface Match {
  id: string
  player1_id: string
  player2_id: string
  player1_sets: number
  player2_sets: number
  winner_id: string
  p1_elo_before: number
  p2_elo_before: number
  p1_elo_after: number
  p2_elo_after: number
  played_at: string
  // Joined data
  player1?: Player
  player2?: Player
  winner?: Player
}
