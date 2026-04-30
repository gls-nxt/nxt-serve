"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import type { Player } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Medal, Award } from "lucide-react"

const fetcher = async (): Promise<Player[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("elo", { ascending: false })
  
  if (error) throw error
  return data || []
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
  return <span className="w-5 text-center text-muted-foreground font-mono">{rank}</span>
}

function getWinPercentage(wins: number, losses: number): string {
  const total = wins + losses
  if (total === 0) return "0%"
  return `${Math.round((wins / total) * 100)}%`
}

export function Leaderboard() {
  const { data: players, error, isLoading } = useSWR("players", fetcher, {
    refreshInterval: 5000,
  })

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-secondary" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center text-destructive">
          Failed to load leaderboard. Please try again.
        </CardContent>
      </Card>
    )
  }

  if (!players || players.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No players registered yet. Add some players to get started!
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-[40px_1fr_80px_60px_60px_60px] gap-2 px-3 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span>#</span>
            <span>Player</span>
            <span className="text-center">ELO</span>
            <span className="text-center">W</span>
            <span className="text-center">L</span>
            <span className="text-center">Win%</span>
          </div>
          
          {/* Player rows */}
          {players.map((player, index) => {
            const rank = index + 1
            const isTopThree = rank <= 3
            
            return (
              <div
                key={player.id}
                className={`grid grid-cols-[40px_1fr_80px_60px_60px_60px] gap-2 items-center px-3 py-3 rounded-lg transition-colors ${
                  isTopThree 
                    ? "bg-primary/10 border border-primary/20" 
                    : "bg-secondary/30 hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center justify-center">
                  {getRankIcon(rank)}
                </div>
                <span className={`font-medium truncate ${isTopThree ? "text-foreground" : "text-foreground/80"}`}>
                  {player.name}
                </span>
                <div className="flex justify-center">
                  <Badge 
                    variant={isTopThree ? "default" : "secondary"}
                    className={isTopThree ? "bg-primary text-primary-foreground" : ""}
                  >
                    {player.elo}
                  </Badge>
                </div>
                <span className="text-center text-green-400 font-mono text-sm">
                  {player.wins}
                </span>
                <span className="text-center text-red-400 font-mono text-sm">
                  {player.losses}
                </span>
                <span className="text-center text-muted-foreground font-mono text-sm">
                  {getWinPercentage(player.wins, player.losses)}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
