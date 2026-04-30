"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "@/components/header"
import { Leaderboard } from "@/components/leaderboard"
import { RecordMatch } from "@/components/record-match"
import { PlayersTab } from "@/components/players-tab"
import { MatchHistory } from "@/components/match-history"

export default function Home() {
  const [activeTab, setActiveTab] = useState("leaderboard")

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-secondary/50 p-1">
            <TabsTrigger 
              value="leaderboard"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Leaderboard
            </TabsTrigger>
            <TabsTrigger 
              value="record"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Record Match
            </TabsTrigger>
            <TabsTrigger 
              value="players"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Players
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="mt-6">
            <Leaderboard />
          </TabsContent>

          <TabsContent value="record" className="mt-6">
            <RecordMatch />
          </TabsContent>

          <TabsContent value="players" className="mt-6">
            <PlayersTab />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <MatchHistory />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
