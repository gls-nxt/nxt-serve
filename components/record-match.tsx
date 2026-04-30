"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import { calculateMatchElo } from "@/lib/elo"
import type { Player } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Swords, Save } from "lucide-react"

const fetcher = async (): Promise<Player[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name")
  
  if (error) throw error
  return data || []
}

export function RecordMatch() {
  const { data: players, isLoading } = useSWR("players", fetcher)
  const [player1Id, setPlayer1Id] = useState("")
  const [player2Id, setPlayer2Id] = useState("")
  const [player1Sets, setPlayer1Sets] = useState("")
  const [player2Sets, setPlayer2Sets] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!player1Id || !player2Id) {
      toast.error("Please select both players")
      return
    }
    
    if (player1Id === player2Id) {
      toast.error("Please select two different players")
      return
    }

    const p1Sets = parseInt(player1Sets)
    const p2Sets = parseInt(player2Sets)

    if (isNaN(p1Sets) || isNaN(p2Sets) || p1Sets < 0 || p2Sets < 0) {
      toast.error("Please enter valid set scores")
      return
    }

    if (p1Sets === p2Sets) {
      toast.error("No draws allowed - someone must win!")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      
      // Get current player data
      const player1 = players?.find(p => p.id === player1Id)
      const player2 = players?.find(p => p.id === player2Id)
      
      if (!player1 || !player2) {
        toast.error("Player not found")
        return
      }

      const player1Won = p1Sets > p2Sets
      const winnerId = player1Won ? player1Id : player2Id
      const winner = player1Won ? player1 : player2

      // Calculate new ELO ratings
      const { newPlayer1Elo, newPlayer2Elo } = calculateMatchElo(
        player1.elo,
        player2.elo,
        player1Won
      )

      const eloChange = Math.abs(newPlayer1Elo - player1.elo)

      // Insert match record
      const { error: matchError } = await supabase.from("matches").insert({
        player1_id: player1Id,
        player2_id: player2Id,
        player1_sets: p1Sets,
        player2_sets: p2Sets,
        winner_id: winnerId,
        p1_elo_before: player1.elo,
        p2_elo_before: player2.elo,
        p1_elo_after: newPlayer1Elo,
        p2_elo_after: newPlayer2Elo,
      })

      if (matchError) throw matchError

      // Update player 1 stats
      const { error: p1Error } = await supabase
        .from("players")
        .update({
          elo: newPlayer1Elo,
          wins: player1Won ? player1.wins + 1 : player1.wins,
          losses: player1Won ? player1.losses : player1.losses + 1,
        })
        .eq("id", player1Id)

      if (p1Error) throw p1Error

      // Update player 2 stats
      const { error: p2Error } = await supabase
        .from("players")
        .update({
          elo: newPlayer2Elo,
          wins: player1Won ? player2.wins : player2.wins + 1,
          losses: player1Won ? player2.losses + 1 : player2.losses,
        })
        .eq("id", player2Id)

      if (p2Error) throw p2Error

      // Refresh data
      mutate("players")
      mutate("matches")

      // Reset form
      setPlayer1Id("")
      setPlayer2Id("")
      setPlayer1Sets("")
      setPlayer2Sets("")

      toast.success(`${winner.name} wins! +${eloChange} ELO`, {
        description: `${player1.name} ${p1Sets} - ${p2Sets} ${player2.name}`,
      })
    } catch (error) {
      console.error("Error recording match:", error)
      toast.error("Failed to record match. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Record Match</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full bg-secondary" />
          <Skeleton className="h-10 w-full bg-secondary" />
          <Skeleton className="h-10 w-full bg-secondary" />
        </CardContent>
      </Card>
    )
  }

  const availablePlayers = players || []

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          Record Match
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Log a new match result and update ELO ratings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player Selection Row */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full space-y-2">
              <Label htmlFor="player1" className="text-foreground">Player 1</Label>
              <Select value={player1Id} onValueChange={setPlayer1Id}>
                <SelectTrigger id="player1" className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {availablePlayers.map((player) => (
                    <SelectItem 
                      key={player.id} 
                      value={player.id}
                      disabled={player.id === player2Id}
                      className="text-foreground"
                    >
                      {player.name} ({player.elo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center pt-6 hidden md:flex">
              <span className="text-xl font-bold text-primary">VS</span>
            </div>

            <div className="flex-1 w-full space-y-2">
              <Label htmlFor="player2" className="text-foreground">Player 2</Label>
              <Select value={player2Id} onValueChange={setPlayer2Id}>
                <SelectTrigger id="player2" className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {availablePlayers.map((player) => (
                    <SelectItem 
                      key={player.id} 
                      value={player.id}
                      disabled={player.id === player1Id}
                      className="text-foreground"
                    >
                      {player.name} ({player.elo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile VS divider */}
          <div className="flex justify-center md:hidden">
            <span className="text-xl font-bold text-primary">VS</span>
          </div>

          {/* Score Row */}
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="player1Sets" className="text-foreground text-center block">
                {player1Id ? availablePlayers.find(p => p.id === player1Id)?.name || "Player 1" : "Player 1"} Sets
              </Label>
              <Input
                id="player1Sets"
                type="number"
                min="0"
                max="9"
                value={player1Sets}
                onChange={(e) => setPlayer1Sets(e.target.value)}
                placeholder="0"
                className="bg-secondary border-border text-foreground text-center text-3xl font-bold h-16"
              />
            </div>

            <div className="pb-3">
              <span className="text-2xl font-bold text-muted-foreground">-</span>
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="player2Sets" className="text-foreground text-center block">
                {player2Id ? availablePlayers.find(p => p.id === player2Id)?.name || "Player 2" : "Player 2"} Sets
              </Label>
              <Input
                id="player2Sets"
                type="number"
                min="0"
                max="9"
                value={player2Sets}
                onChange={(e) => setPlayer2Sets(e.target.value)}
                placeholder="0"
                className="bg-secondary border-border text-foreground text-center text-3xl font-bold h-16"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !player1Id || !player2Id || !player1Sets || !player2Sets}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save Result"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
