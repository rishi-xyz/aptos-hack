"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, TrendingUp, Shield, Zap, DollarSign, CheckCircle, AlertCircle, Info } from "lucide-react"
import Link from "next/link"
import { whaleApi, StrategyAllocation } from "@/lib/api"

interface Strategy {
  id: string
  name: string
  description: string
  riskLevel: 'low' | 'moderate' | 'high'
  expectedReturn: string
  minAmount: number
  color: string
  icon: React.ReactNode
  features: string[]
}

export default function StrategiesPage() {
  const [allocations, setAllocations] = useState<{ [key: string]: string }>({
    aggressive: '',
    moderate: '',
    conservative: ''
  })
  const [totalBudget, setTotalBudget] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const strategies: Strategy[] = [
    {
      id: 'aggressive',
      name: 'Aggressive Growth',
      description: 'High-risk, high-return strategy focusing on volatile whale movements and quick profits',
      riskLevel: 'high',
      expectedReturn: '25-40% annually',
      minAmount: 1000,
      color: 'red',
      icon: <Zap className="h-6 w-6" />,
      features: [
        'Follows large whale movements',
        'Quick entry/exit positions',
        'Higher risk tolerance',
        'Leverages market volatility'
      ]
    },
    {
      id: 'moderate',
      name: 'Balanced Growth',
      description: 'Medium-risk strategy balancing safety with growth through diversified whale tracking',
      riskLevel: 'moderate',
      expectedReturn: '15-25% annually',
      minAmount: 500,
      color: 'yellow',
      icon: <TrendingUp className="h-6 w-6" />,
      features: [
        'Diversified whale portfolio',
        'Risk management protocols',
        'Steady growth focus',
        'Market trend following'
      ]
    },
    {
      id: 'conservative',
      name: 'Conservative Income',
      description: 'Low-risk strategy focused on stable returns from established whale patterns',
      riskLevel: 'low',
      expectedReturn: '8-15% annually',
      minAmount: 100,
      color: 'green',
      icon: <Shield className="h-6 w-6" />,
      features: [
        'Established whale patterns',
        'Lower volatility exposure',
        'Capital preservation focus',
        'Steady income generation'
      ]
    }
  ]

  // Load saved allocations on component mount
  useEffect(() => {
    const loadAllocations = async () => {
      try {
        const saved = await whaleApi.getStrategyAllocation()
        if (saved) {
          setTotalBudget(saved.totalBudget.toString())
          setAllocations({
            aggressive: saved.aggressive.toString(),
            moderate: saved.moderate.toString(),
            conservative: saved.conservative.toString()
          })
        }
      } catch (error) {
        console.error('Failed to load saved allocations:', error)
      }
    }
    loadAllocations()
  }, [])

  const handleAllocationChange = (strategyId: string, value: string) => {
    // Only allow numbers
    const numValue = value.replace(/[^0-9.]/g, '')
    setAllocations(prev => ({ ...prev, [strategyId]: numValue }))
  }

  const getTotalAllocated = () => {
    return Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
  }

  const getRemainingBudget = () => {
    const budget = parseFloat(totalBudget) || 0
    return budget - getTotalAllocated()
  }

  const handleSaveAllocations = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const total = parseFloat(totalBudget) || 0
      const allocated = getTotalAllocated()

      if (total === 0) {
        setMessage({ type: 'error', text: 'Please set your total budget first' })
        return
      }

      if (allocated > total) {
        setMessage({ type: 'error', text: 'Total allocations exceed your budget' })
        return
      }

      // Validate minimum amounts
      for (const strategy of strategies) {
        const amount = parseFloat(allocations[strategy.id] || '0')
        if (amount > 0 && amount < strategy.minAmount) {
          setMessage({ type: 'error', text: `${strategy.name} requires minimum $${strategy.minAmount}` })
          return
        }
      }

      const allocationData: StrategyAllocation = {
        aggressive: parseFloat(allocations.aggressive) || 0,
        moderate: parseFloat(allocations.moderate) || 0,
        conservative: parseFloat(allocations.conservative) || 0,
        totalBudget: total
      }

      await whaleApi.saveStrategyAllocation(allocationData)
      setMessage({ type: 'success', text: 'Strategy allocations saved successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save allocations' })
    } finally {
      setIsLoading(false)
    }
  }

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trading Strategies</h1>
            <p className="text-gray-600 dark:text-gray-300">Allocate your capital across different risk strategies</p>
          </div>
        </div>

        {/* Budget Overview */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-6 w-6 mr-2 text-blue-600" />
              Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="budget">Total Budget ($)</Label>
                <Input
                  id="budget"
                  type="text"
                  placeholder="10000"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Allocated</Label>
                <div className="text-2xl font-bold text-blue-600">
                  ${getTotalAllocated().toFixed(2)}
                </div>
                <Progress value={(getTotalAllocated() / (parseFloat(totalBudget) || 1)) * 100} className="mt-2" />
              </div>
              <div className="space-y-2">
                <Label>Remaining Budget</Label>
                <div className={`text-2xl font-bold ${getRemainingBudget() < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${getRemainingBudget().toFixed(2)}
                </div>
                <p className="text-sm text-gray-600">
                  {getRemainingBudget() < 0 ? 'Over budget' : 'Available for allocation'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategy Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {strategies.map((strategy) => {
            const allocated = parseFloat(allocations[strategy.id] || '0')
            const percentage = parseFloat(totalBudget) > 0 ? (allocated / parseFloat(totalBudget)) * 100 : 0
            
            return (
              <Card key={strategy.id} className={`bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-${strategy.color}-500`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg bg-${strategy.color}-100 text-${strategy.color}-600`}>
                        {strategy.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{strategy.name}</CardTitle>
                        <Badge className={`text-xs ${getRiskBadgeColor(strategy.riskLevel)}`}>
                          {strategy.riskLevel.charAt(0).toUpperCase() + strategy.riskLevel.slice(1)} Risk
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {strategy.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Expected Return:</span>
                      <span className="font-semibold text-green-600">{strategy.expectedReturn}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Minimum Investment:</span>
                      <span className="font-semibold">${strategy.minAmount}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`allocation-${strategy.id}`}>Allocation ($)</Label>
                    <Input
                      id={`allocation-${strategy.id}`}
                      type="text"
                      placeholder={`Min: $${strategy.minAmount}`}
                      value={allocations[strategy.id]}
                      onChange={(e) => handleAllocationChange(strategy.id, e.target.value)}
                      className={allocated > 0 && allocated < strategy.minAmount ? 'border-red-500' : ''}
                    />
                    {allocated > 0 && allocated < strategy.minAmount && (
                      <p className="text-xs text-red-600">Minimum $${strategy.minAmount} required</p>
                    )}
                  </div>

                  {allocated > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Portfolio Weight:</span>
                        <span className="font-semibold">{percentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Key Features:</Label>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {strategy.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-1">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Info Card */}
        <Card className="mb-8 bg-blue-50/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About Strategy Allocation</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Diversifying across strategies can help manage risk while optimizing returns</li>
                  <li>• Each strategy follows different whale tracking patterns and risk parameters</li>
                  <li>• You can adjust allocations anytime based on market conditions and your risk tolerance</li>
                  <li>• Past performance doesn't guarantee future results - invest wisely</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div>
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
          </div>
          <div className="space-x-4">
            <Button variant="outline" onClick={() => {
              setAllocations({ aggressive: '', moderate: '', conservative: '' })
              setTotalBudget('')
              setMessage(null)
            }}>
              Reset
            </Button>
            <Button 
              onClick={handleSaveAllocations}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Allocations'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
