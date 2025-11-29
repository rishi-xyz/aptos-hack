"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, TrendingUp, AlertCircle, Plus } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const mockWhales = [
    {
      address: "0x1a2b...3c4d",
      status: "active",
      lastTransaction: "2 mins ago",
      amount: "$1,250,000",
      type: "Buy"
    },
    {
      address: "0x5e6f...7g8h",
      status: "active", 
      lastTransaction: "15 mins ago",
      amount: "$890,000",
      type: "Sell"
    },
    {
      address: "0x9i0j...1k2l",
      status: "inactive",
      lastTransaction: "2 hours ago",
      amount: "$2,100,000",
      type: "Buy"
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">Monitor whale activity in real-time</p>
        </div>
        <Link href="/dashboard/manage-whales">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Whale
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Whales</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 from last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$4.2M</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">2 high priority</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Currently Monitoring Whales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockWhales.map((whale, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">{whale.address}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Last transaction: {whale.lastTransaction}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-medium">{whale.amount}</p>
                    <Badge variant={whale.type === "Buy" ? "default" : "destructive"}>
                      {whale.type}
                    </Badge>
                  </div>
                  <Badge variant={whale.status === "active" ? "default" : "secondary"}>
                    {whale.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
