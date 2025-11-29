"use client"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Wallet } from "lucide-react"
import { useState } from "react"

export function Header() {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")

  const handleConnectWallet = () => {
    if (isConnected) {
      setIsConnected(false)
      setWalletAddress("")
    } else {
      // Simulate wallet connection
      setIsConnected(true)
      setWalletAddress("0x1a2b...3c4d")
    }
  }

  return (
    <header className="border-b bg-white dark:bg-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <SidebarTrigger />
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Whale Stream
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {isConnected && (
            <div className="hidden sm:block">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Connected: <span className="font-mono font-medium">{walletAddress}</span>
              </p>
            </div>
          )}
          <Button 
            onClick={handleConnectWallet}
            variant={isConnected ? "outline" : "default"}
            className="flex items-center space-x-2"
          >
            <Wallet className="h-4 w-4" />
            <span>{isConnected ? "Disconnect" : "Connect Wallet"}</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
