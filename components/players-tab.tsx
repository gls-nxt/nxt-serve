"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import type { Player } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { UserPlus, Users } from "lucide-react"

const fetcher = async (): Promise<Player[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name")
  
  if (error) throw error
  return data || []
}

export function PlayersTab() {
  const { data: players, isLoading } = useSWR("players", fetcher)
  const [playerName, setPlayerName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedName = playerName.trim()
    
    if (!trimmedName) {
      toast.error("Please enter a player name")
      return
    }

    if (trimmedName.length < 2) {
      toast.error("Name must be at least 2 characters")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      
      const { error } = await supabase.from("players").insert({
        name: trimmedName,
        elo: 1000,
        wins: 0,
        losses: 0,
      })

      if (error) {
        if (error.code === "23505") {
          toast.error("A player with this name already exists")
        } else {
          throw error
        }
        return
      }

      mutate("players")
      setPlayerName("")
      toast.success(`${trimmedName} joined the league!`, {
        description: "Starting ELO: 1000",
      })
    } catch (error) {
      console.error("Error adding player:", error)
      toast.error("Failed to add player. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Player Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Register New Player
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Add a new competitor to the league
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddPlayer} className="flex gap-3">
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter player name"
              className="flex-1 bg-secondary border-border text-foreground"
              disabled={isSubmitting}
            />
            <Button 
              type="submit" 
              disabled={isSubmitting || !playerName.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isSubmitting ? "Adding..." : "Add Player"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Players List Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Registered Players
            {players && (
              <Badge variant="secondary" className="ml-2">
                {players.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 bg-secondary" />
              ))}
            </div>
          ) : !players || players.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No players registered yet. Be the first to join!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 bg-secondary/50 px-3 py-2 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <span className="font-medium text-foreground">{player.name}</span>
                  <Badge 
                    variant="outline" 
                    className="text-primary border-primary/50 font-mono text-xs"
                  >
                    {player.elo}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
