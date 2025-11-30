"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, TrendingUp, AlertCircle, Plus, ArrowUpRight, ArrowDownRight, Fish, Clock, DollarSign } from "lucide-react"
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
    },
    {
      address: "0x3m4n...5o6p",
      status: "active",
      lastTransaction: "5 mins ago",
      amount: "$750,000",
      type: "Buy"
    },
    {
      address: "0x7q8r...9s0t",
      status: "active",
      lastTransaction: "30 mins ago",
      amount: "$1,800,000",
      type: "Sell"
    }
  ]

  const stats = [
    {
      title: "Active Whales",
      value: "12",
      change: "+2 from last hour",
      icon: Activity,
      trend: "up",
      color: "text-blue-600"
    },
    {
      title: "Total Volume",
      value: "$4.2M",
      change: "+12% from yesterday",
      icon: DollarSign,
      trend: "up",
      color: "text-green-600"
    },
    {
      title: "Alerts",
      value: "3",
      change: "2 high priority",
      icon: AlertCircle,
      trend: "down",
      color: "text-red-600"
    }
  ]

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Whale Dashboard</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">Monitor whale activity in real-time</p>
          </div>
          <Link href="/dashboard/manage-whales">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-5 w-5 mr-2" />
              Add Whale
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Whale List */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Fish className="h-6 w-6 mr-2 text-blue-600" />
                  Currently Monitoring Whales
                </CardTitle>
                <Badge variant="secondary" className="text-sm">
                  {mockWhales.length} whales
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {mockWhales.map((whale, index) => (
                    <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${whale.status === "active" ? "bg-green-500" : "bg-gray-400"}`}></div>
                        <div>
                          <p className="font-mono font-medium text-gray-900 dark:text-white">{whale.address}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{whale.lastTransaction}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold text-lg text-gray-900 dark:text-white">{whale.amount}</p>
                          <Badge 
                            variant={whale.type === "Buy" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {whale.type}
                          </Badge>
                        </div>
                        <Badge 
                          variant={whale.status === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {whale.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Activity className="h-6 w-6 mr-2 text-blue-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Large Buy Order</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">0x1a2b...3c4d • $1.2M</p>
                      <p className="text-xs text-gray-500">2 mins ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Large Sell Order</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">0x5e6f...7g8h • $890K</p>
                      <p className="text-xs text-gray-500">15 mins ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Whale Alert</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Unusual activity detected</p>
                      <p className="text-xs text-gray-500">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">New Whale Added</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">0x9i0j...1k2l</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
