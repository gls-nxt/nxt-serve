"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import type { Match, Player } from "@/lib/types"
import { calculateMatchElo } from "@/lib/elo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { History, Trophy, TrendingUp, TrendingDown, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface MatchWithPlayers extends Match {
  player1: Player
  player2: Player
}

const fetcher = async (): Promise<MatchWithPlayers[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("matches")
    .select(`
      *,
      player1:players!matches_player1_id_fkey(*),
      player2:players!matches_player2_id_fkey(*)
    `)
    .order("played_at", { ascending: false })
    .limit(50)
  
  if (error) throw error
  return (data as MatchWithPlayers[]) || []
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) + " today"
  } else if (days === 1) {
    return "Yesterday"
  } else if (days < 7) {
    return `${days} days ago`
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
  }
}

export function MatchHistory() {
  const { data: matches, error, isLoading } = useSWR("matches", fetcher, {
    refreshInterval: 5000,
  })

  const [editingMatch, setEditingMatch] = useState<MatchWithPlayers | null>(null)
  const [deletingMatch, setDeletingMatch] = useState<MatchWithPlayers | null>(null)
  const [editPlayer1Sets, setEditPlayer1Sets] = useState("")
  const [editPlayer2Sets, setEditPlayer2Sets] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openEditDialog = (match: MatchWithPlayers) => {
    setEditingMatch(match)
    setEditPlayer1Sets(String(match.player1_sets))
    setEditPlayer2Sets(String(match.player2_sets))
  }

  const handleDelete = async () => {
    if (!deletingMatch) return
    setIsSubmitting(true)

    const supabase = createClient()
    const match = deletingMatch

    try {
      // Get current player data
      const { data: player1Data } = await supabase
        .from("players")
        .select("*")
        .eq("id", match.player1_id)
        .single()

      const { data: player2Data } = await supabase
        .from("players")
        .select("*")
        .eq("id", match.player2_id)
        .single()

      if (!player1Data || !player2Data) {
        throw new Error("Could not find players")
      }

      const p1Won = match.winner_id === match.player1_id

      // Reverse the ELO and win/loss changes
      const { error: p1Error } = await supabase
        .from("players")
        .update({
          elo: match.p1_elo_before,
          wins: player1Data.wins - (p1Won ? 1 : 0),
          losses: player1Data.losses - (p1Won ? 0 : 1),
        })
        .eq("id", match.player1_id)

      if (p1Error) throw p1Error

      const { error: p2Error } = await supabase
        .from("players")
        .update({
          elo: match.p2_elo_before,
          wins: player2Data.wins - (p1Won ? 0 : 1),
          losses: player2Data.losses - (p1Won ? 1 : 0),
        })
        .eq("id", match.player2_id)

      if (p2Error) throw p2Error

      // Delete the match
      const { error: deleteError } = await supabase
        .from("matches")
        .delete()
        .eq("id", match.id)

      if (deleteError) throw deleteError

      toast.success("Match deleted", {
        description: `${match.player1.name} vs ${match.player2.name} has been removed`,
      })

      // Refresh all data
      mutate("matches")
      mutate("players")
      mutate("leaderboard")
    } catch (err) {
      console.error("Delete error:", err)
      toast.error("Failed to delete match")
    } finally {
      setIsSubmitting(false)
      setDeletingMatch(null)
    }
  }

  const handleEdit = async () => {
    if (!editingMatch) return

    const p1Sets = parseInt(editPlayer1Sets)
    const p2Sets = parseInt(editPlayer2Sets)

    if (isNaN(p1Sets) || isNaN(p2Sets) || p1Sets < 0 || p2Sets < 0) {
      toast.error("Please enter valid set scores")
      return
    }

    if (p1Sets === p2Sets) {
      toast.error("Match cannot end in a draw")
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()
    const match = editingMatch

    try {
      // Get current player data
      const { data: player1Data } = await supabase
        .from("players")
        .select("*")
        .eq("id", match.player1_id)
        .single()

      const { data: player2Data } = await supabase
        .from("players")
        .select("*")
        .eq("id", match.player2_id)
        .single()

      if (!player1Data || !player2Data) {
        throw new Error("Could not find players")
      }

      const oldP1Won = match.winner_id === match.player1_id
      const newP1Won = p1Sets > p2Sets
      const newWinnerId = newP1Won ? match.player1_id : match.player2_id

      // First, restore ELO to before the match
      const restoredP1Elo = match.p1_elo_before
      const restoredP2Elo = match.p2_elo_before

      // Calculate new ELO based on new result
      const { newPlayer1Elo, newPlayer2Elo } = calculateMatchElo(
        restoredP1Elo,
        restoredP2Elo,
        newP1Won
      )

      // Calculate win/loss adjustments
      let p1WinsDelta = 0
      let p1LossesDelta = 0
      let p2WinsDelta = 0
      let p2LossesDelta = 0

      if (oldP1Won !== newP1Won) {
        // Winner changed
        if (newP1Won) {
          // P1 now wins (was P2 winning)
          p1WinsDelta = 1
          p1LossesDelta = -1
          p2WinsDelta = -1
          p2LossesDelta = 1
        } else {
          // P2 now wins (was P1 winning)
          p1WinsDelta = -1
          p1LossesDelta = 1
          p2WinsDelta = 1
          p2LossesDelta = -1
        }
      }

      // Update player 1
      const { error: p1Error } = await supabase
        .from("players")
        .update({
          elo: newPlayer1Elo,
          wins: player1Data.wins + p1WinsDelta,
          losses: player1Data.losses + p1LossesDelta,
        })
        .eq("id", match.player1_id)

      if (p1Error) throw p1Error

      // Update player 2
      const { error: p2Error } = await supabase
        .from("players")
        .update({
          elo: newPlayer2Elo,
          wins: player2Data.wins + p2WinsDelta,
          losses: player2Data.losses + p2LossesDelta,
        })
        .eq("id", match.player2_id)

      if (p2Error) throw p2Error

      // Update the match
      const { error: matchError } = await supabase
        .from("matches")
        .update({
          player1_sets: p1Sets,
          player2_sets: p2Sets,
          winner_id: newWinnerId,
          p1_elo_after: newPlayer1Elo,
          p2_elo_after: newPlayer2Elo,
        })
        .eq("id", match.id)

      if (matchError) throw matchError

      const winnerName = newP1Won ? match.player1.name : match.player2.name
      toast.success("Match updated", {
        description: `${winnerName} wins ${p1Sets}-${p2Sets}`,
      })

      // Refresh all data
      mutate("matches")
      mutate("players")
      mutate("leaderboard")
    } catch (err) {
      console.error("Edit error:", err)
      toast.error("Failed to update match")
    } finally {
      setIsSubmitting(false)
      setEditingMatch(null)
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Match History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full bg-secondary" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center text-destructive">
          Failed to load match history. Please try again.
        </CardContent>
      </Card>
    )
  }

  if (!matches || matches.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Match History
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No matches played yet. Record your first match!
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Match History
            <Badge variant="secondary" className="ml-2">
              {matches.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {matches.map((match) => {
              const p1Won = match.winner_id === match.player1_id
              const p1EloChange = match.p1_elo_after - match.p1_elo_before
              const p2EloChange = match.p2_elo_after - match.p2_elo_before

              return (
                <div
                  key={match.id}
                  className="bg-secondary/30 rounded-lg p-4 border border-border/50 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(match.played_at)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Match actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        <DropdownMenuItem 
                          onClick={() => openEditDialog(match)}
                          className="text-foreground cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeletingMatch(match)}
                          className="text-destructive cursor-pointer focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Player 1 */}
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        {p1Won && <Trophy className="w-4 h-4 text-yellow-400" />}
                        <span className={`font-medium ${p1Won ? "text-foreground" : "text-muted-foreground"}`}>
                          {match.player1.name}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${p1EloChange > 0 ? "text-green-400" : "text-red-400"}`}>
                        {p1EloChange > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{p1EloChange > 0 ? `+${p1EloChange}` : p1EloChange}</span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="px-4">
                      <div className="flex items-center gap-2 bg-background/50 px-4 py-2 rounded-lg">
                        <span className={`text-xl font-bold ${p1Won ? "text-primary" : "text-muted-foreground"}`}>
                          {match.player1_sets}
                        </span>
                        <span className="text-muted-foreground">-</span>
                        <span className={`text-xl font-bold ${!p1Won ? "text-primary" : "text-muted-foreground"}`}>
                          {match.player2_sets}
                        </span>
                      </div>
                    </div>

                    {/* Player 2 */}
                    <div className="flex-1 flex items-center justify-end gap-2">
                      <div className={`flex items-center gap-1 text-xs ${p2EloChange > 0 ? "text-green-400" : "text-red-400"}`}>
                        {p2EloChange > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{p2EloChange > 0 ? `+${p2EloChange}` : p2EloChange}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${!p1Won ? "text-foreground" : "text-muted-foreground"}`}>
                          {match.player2.name}
                        </span>
                        {!p1Won && <Trophy className="w-4 h-4 text-yellow-400" />}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Match</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the set scores for this match. ELO ratings will be recalculated.
            </DialogDescription>
          </DialogHeader>
          {editingMatch && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="font-medium text-foreground mb-2">{editingMatch.player1.name}</p>
                  <Label htmlFor="editP1Sets" className="sr-only">Player 1 Sets</Label>
                  <Input
                    id="editP1Sets"
                    type="number"
                    min="0"
                    max="9"
                    value={editPlayer1Sets}
                    onChange={(e) => setEditPlayer1Sets(e.target.value)}
                    className="w-20 text-center text-2xl font-bold h-14 bg-secondary border-border text-foreground"
                  />
                </div>
                <span className="text-2xl font-bold text-muted-foreground mt-6">-</span>
                <div className="text-center">
                  <p className="font-medium text-foreground mb-2">{editingMatch.player2.name}</p>
                  <Label htmlFor="editP2Sets" className="sr-only">Player 2 Sets</Label>
                  <Input
                    id="editP2Sets"
                    type="number"
                    min="0"
                    max="9"
                    value={editPlayer2Sets}
                    onChange={(e) => setEditPlayer2Sets(e.target.value)}
                    className="w-20 text-center text-2xl font-bold h-14 bg-secondary border-border text-foreground"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditingMatch(null)}
              className="border-border text-foreground"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEdit} 
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingMatch} onOpenChange={(open) => !open && setDeletingMatch(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Match</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deletingMatch && (
                <>
                  Are you sure you want to delete the match between{" "}
                  <span className="font-medium text-foreground">{deletingMatch.player1.name}</span> and{" "}
                  <span className="font-medium text-foreground">{deletingMatch.player2.name}</span>?
                  <br /><br />
                  This will reverse the ELO changes and win/loss records for both players.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
