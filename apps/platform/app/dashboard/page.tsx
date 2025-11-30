"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, TrendingUp, AlertCircle, Plus, ArrowUpRight, ArrowDownRight, Fish, Clock, DollarSign, Loader2, Wallet, Wifi, WifiOff, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useWhales } from "@/hooks/useWhales"
import { formatDistanceToNow } from "date-fns"
import { calculateBalanceChanges, formatAptAmount } from "@/lib/api"
import { useUser } from "@/contexts/UserContext"

export default function DashboardPage() {
  const { user, connect, disconnect, isLoading: userLoading, backendStatus, connectionError, refreshWhales } = useUser();
  const { whales, loading, error, recentEvents, stats, addWhale, removeWhale } = useWhales(user?.address);

  const handleAddWhale = async (address: string) => {
    if (!user) {
      alert('Please connect your wallet first');
      return;
    }
    
    const success = await addWhale(address)
    if (success) {
      console.log('Whale added successfully')
    }
  }

  // Mock wallet connection for demo
  const handleConnectWallet = async () => {
    try {
      // In a real app, this would connect to actual wallet
      const mockAddress = "0x1234567890abcdef1234567890abcdef12345678";
      await connect(mockAddress);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      // Handle error (show toast, etc.)
    }
  }

  // Handle wallet reconnection/refresh
  const handleRefreshConnection = async () => {
    if (user?.address) {
      try {
        await refreshWhales();
      } catch (error) {
        console.error('Failed to refresh connection:', error);
      }
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Wallet className="h-16 w-16 mx-auto mb-4 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Connect your wallet to start tracking whales and managing your trading strategies
          </p>
          
          {/* Backend status indicator */}
          <div className="mb-6">
            {backendStatus === 'checking' && (
              <div className="flex items-center justify-center space-x-2 text-yellow-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Checking backend status...</span>
              </div>
            )}
            {backendStatus === 'offline' && (
              <div className="flex items-center justify-center space-x-2 text-red-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm">Backend server is offline</span>
              </div>
            )}
            {backendStatus === 'online' && (
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <Wifi className="h-4 w-4" />
                <span className="text-sm">Backend server online</span>
              </div>
            )}
          </div>
          
          <Button onClick={handleConnectWallet} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Wallet className="h-5 w-5 mr-2" />
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  const handleRemoveWhale = async (address: string) => {
    const success = await removeWhale(address)
    if (success) {
      console.log('Whale removed successfully')
    }
  }

  const statsData = [
    {
      title: "Active Whales",
      value: stats.activeWhales.toString(),
      change: `Total tracked: ${stats.totalWhales}`,
      icon: Activity,
      trend: "up" as const,
      color: "text-blue-600"
    },
    {
      title: "Net Volume",
      value: `${formatAptAmount(stats.netVolume.toString())} APT`,
      change: stats.netVolume >= 0 ? "Net buying" : "Net selling",
      icon: DollarSign,
      trend: stats.netVolume >= 0 ? "up" as const : "down" as const,
      color: stats.netVolume >= 0 ? "text-green-600" : "text-red-600"
    },
    {
      title: "Total Volume",
      value: `${formatAptAmount(stats.totalVolume.toString())} APT`,
      change: "All transactions",
      icon: TrendingUp,
      trend: "up" as const,
      color: "text-blue-600"
    },
    {
      title: "Alerts",
      value: stats.alerts.toString(),
      change: "Recent activity",
      icon: AlertCircle,
      trend: "down" as const,
      color: "text-red-600"
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg text-gray-600 dark:text-gray-300">Loading whale data...</p>
        </div>
      </div>
    )
  }

  // Show backend error state
  if (backendStatus === 'offline' || connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <WifiOff className="h-16 w-16 mx-auto mb-4 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Backend Offline</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {connectionError || 'The backend server is currently unavailable. Some features may not work properly.'}
          </p>
          <div className="space-y-4">
            <Button onClick={handleRefreshConnection} variant="outline" className="w-full">
              <RefreshCw className="h-5 w-5 mr-2" />
              Retry Connection
            </Button>
            <Button onClick={() => window.location.reload()} className="w-full">
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-lg text-red-600 mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Whale Dashboard</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">Monitor whale activity in real-time</p>
          </div>
          <div className="flex space-x-3">
            {/* Backend status indicator */}
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/80 backdrop-blur-sm border">
              {backendStatus === 'checking' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                  <span className="text-sm text-yellow-600">Checking...</span>
                </>
              )}
              {backendStatus === 'offline' && (
                <>
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">Offline</span>
                </>
              )}
              {backendStatus === 'online' && (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Online</span>
                </>
              )}
            </div>
            
            {/* Refresh connection button */}
            <Button onClick={handleRefreshConnection} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Link href="/dashboard/strategies">
              <Button size="lg" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white">
                <TrendingUp className="h-5 w-5 mr-2" />
                Strategies
              </Button>
            </Link>
            <Link href="/dashboard/manage-whales">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-5 w-5 mr-2" />
                Add Whale
              </Button>
            </Link>
          </div>
        </div>

        {/* User info and backend status */}
        <div className="mb-6 p-4 bg-white/80 backdrop-blur-sm rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm text-gray-600">Connected Wallet</p>
                <p className="font-mono text-sm text-gray-900 dark:text-white">{user.address}</p>
              </div>
              {user.whales && (
                <div>
                  <p className="text-sm text-gray-600">Tracked Whales</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{user.whales.length}</p>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={disconnect} variant="outline" size="sm">
                Disconnect
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsData.map((stat, index) => (
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
                  {whales.length} whales
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {whales.length === 0 ? (
                  <div className="p-8 text-center">
                    <Fish className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-300 mb-4">No whales being tracked yet</p>
                    <Link href="/dashboard/manage-whales">
                      <Button>Add Your First Whale</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {whales.map((whale, index) => (
                      <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${whale.isActive ? "bg-green-500" : "bg-gray-400"}`}></div>
                          <div>
                            <p className="font-mono font-medium text-gray-900 dark:text-white">{whale.address}</p>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span>
                                {whale.lastActivity 
                                  ? formatDistanceToNow(whale.lastActivity, { addSuffix: true })
                                  : 'No recent activity'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge 
                            variant={whale.isActive ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {whale.isActive ? "active" : "inactive"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveWhale(whale.address)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                {recentEvents.length === 0 ? (
                  <div className="text-center py-4">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentEvents.map((event, index) => {
                      const balanceChanges = calculateBalanceChanges(event);
                      const aptChange = balanceChanges.find(change => change.symbol === 'APT');
                      
                      return (
                        <div key={`${event.txHash}-${index}`} className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            aptChange?.type === 'buy' ? 'bg-green-500' : 
                            aptChange?.type === 'sell' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}></div>
                          <div className="flex-1">
                            {aptChange ? (
                              <>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {aptChange.type === 'buy' ? 'Buy' : aptChange.type === 'sell' ? 'Sell' : 'Neutral'}: {formatAptAmount(aptChange.amount)} APT
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {event.address.slice(0, 6)}...{event.address.slice(-4)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Balance Change</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {event.address.slice(0, 6)}...{event.address.slice(-4)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
