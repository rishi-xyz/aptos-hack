"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Plus, Fish, CheckCircle, AlertCircle, Loader2, Search, Trash2, Eye } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useWhales } from "@/hooks/useWhales"

export default function ManageWhalesPage() {
  const [address, setAddress] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const { addWhale, removeWhale, whales } = useWhales()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address.trim()) {
      setMessage({ type: 'error', text: 'Please enter a valid wallet address' })
      return
    }

    if (whales.some(w => w.address === address)) {
      setMessage({ type: 'error', text: 'This whale is already being tracked' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const success = await addWhale(address.trim())
      if (success) {
        setMessage({ type: 'success', text: `Whale ${address.slice(0, 6)}...${address.slice(-4)} added successfully!` })
        setAddress('')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to add whale' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveWhale = async (whaleAddress: string) => {
    try {
      const success = await removeWhale(whaleAddress)
      if (success) {
        setMessage({ type: 'success', text: `Whale removed successfully!` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to remove whale' })
    }
  }

  const filteredWhales = whales.filter(whale =>
    whale.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Whales</h1>
            <p className="text-gray-600 dark:text-gray-300">Add and manage whale addresses to track</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Whale Form */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Plus className="h-6 w-6 mr-2 text-blue-600" />
                Add New Whale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Wallet Address</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="0x1a2b3c4d5e6f7g8h9i0j..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="font-mono"
                    disabled={isLoading}
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enter the Aptos wallet address you want to track
                  </p>
                </div>

                {message && (
                  <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    {message.type === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                      {message.text}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding Whale...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Whale
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Current Whales */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Fish className="h-6 w-6 mr-2 text-blue-600" />
                  Currently Tracked ({whales.length})
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search whales..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {whales.length === 0 ? (
                <div className="text-center py-8">
                  <Fish className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-300 mb-2">No whales being tracked yet</p>
                  <p className="text-sm text-gray-500">Add your first whale to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredWhales.map((whale, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${whale.isActive ? "bg-green-500" : "bg-gray-400"}`}></div>
                        <div>
                          <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                            {whale.address.slice(0, 10)}...{whale.address.slice(-8)}
                          </p>
                          <Badge variant={whale.isActive ? "default" : "secondary"} className="text-xs mt-1">
                            {whale.isActive ? "active" : "inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRemoveWhale(whale.address)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="mt-8 bg-blue-50/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                <Fish className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About Whale Tracking</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Real-time balance change monitoring via Server-Sent Events</li>
                  <li>• Instant notifications when whales move funds</li>
                  <li>• Track multiple whale addresses simultaneously</li>
                  <li>• View historical activity and patterns</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
