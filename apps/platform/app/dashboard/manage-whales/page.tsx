"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Trash2, Eye } from "lucide-react"
import { useState } from "react"

export default function ManageWhalesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  
  const mockTrackedWhales = [
    {
      id: 1,
      address: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
      nickname: "Mega Whale",
      status: "active",
      totalTransactions: 342,
      totalVolume: "$45.2M",
      lastSeen: "2 mins ago",
      alerts: true
    },
    {
      id: 2,
      address: "0x5e6f7g8h9i0j1k2l3mnop4567890mnop45678",
      nickname: "Silent Trader",
      status: "active",
      totalTransactions: 128,
      totalVolume: "$12.8M",
      lastSeen: "15 mins ago",
      alerts: false
    },
    {
      id: 3,
      address: "0x9i0j1k2l3m4n5o6p7qrst8901qrst8901qrst",
      nickname: "Weekend Warrior",
      status: "inactive",
      totalTransactions: 89,
      totalVolume: "$8.9M",
      lastSeen: "2 hours ago",
      alerts: true
    },
    {
      id: 4,
      address: "0x1q2r3s4t5u6v7w8x9yzab1234567890yzab12",
      nickname: "Flash Buyer",
      status: "active",
      totalTransactions: 567,
      totalVolume: "$67.3M",
      lastSeen: "30 secs ago",
      alerts: true
    }
  ]

  const filteredWhales = mockTrackedWhales.filter(whale =>
    whale.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    whale.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manage Whales</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your whale tracking list</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Whale
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tracked Whale Addresses</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search whales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[300px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredWhales.map((whale) => (
              <div key={whale.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${whale.status === "active" ? "bg-green-500" : "bg-gray-400"}`}></div>
                  <div>
                    <p className="font-medium">{whale.nickname}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                      {whale.address.slice(0, 10)}...{whale.address.slice(-8)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Transactions</p>
                    <p className="font-medium">{whale.totalTransactions}</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Total Volume</p>
                    <p className="font-medium">{whale.totalVolume}</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Last Seen</p>
                    <p className="font-medium">{whale.lastSeen}</p>
                  </div>
                  
                  <Badge variant={whale.alerts ? "default" : "secondary"}>
                    {whale.alerts ? "Alerts ON" : "Alerts OFF"}
                  </Badge>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredWhales.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-300">No whales found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
