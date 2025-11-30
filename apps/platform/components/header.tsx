"use client"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Wallet } from "lucide-react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { useEffect, useState } from "react"

export function Header() {
  const { connect, disconnect, connected, account, wallet, wallets } = useWallet()
  const [showWalletDropdown, setShowWalletDropdown] = useState(false)

  useEffect(() => {
    console.log("Header wallet state changed:", {
      connected,
      account: account?.address?.toString(),
      wallet: wallet?.name,
      availableWallets: wallets?.map(w => w.name),
    });
  }, [connected, account, wallet, wallets]);

  console.log("Header wallet state:", {
    connected,
    account: account?.address?.toString(),
    wallet: wallet?.name,
    availableWallets: wallets?.map(w => w.name),
  });

  const handleConnectWallet = async (walletName?: string) => {
    console.log("Connect wallet button clicked. Current state:", { connected, wallets });
    
    if (connected) {
      console.log("Disconnecting wallet...");
      disconnect();
      setShowWalletDropdown(false);
    } else if (walletName) {
      console.log(`Connecting to specific wallet: ${walletName}`);
      try {
        await connect(walletName);
        setShowWalletDropdown(false);
      } catch (error: any) {
        console.error(`Failed to connect to ${walletName}:`, error);
      }
    } else {
      // Show wallet selection dropdown
      setShowWalletDropdown(!showWalletDropdown);
    }
  };

  const handleWalletSelect = async (walletName: string) => {
    console.log(`Selected wallet: ${walletName}`);
    try {
      await connect(walletName);
      setShowWalletDropdown(false);
    } catch (error: any) {
      console.error(`Failed to connect to ${walletName}:`, error);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
          {connected && account?.address && (
            <div className="hidden sm:block">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Connected: <span className="font-mono font-medium">{formatAddress(account.address.toString())}</span>
              </p>
            </div>
          )}
          <div className="relative">
            <Button 
              onClick={() => handleConnectWallet()}
              variant={connected ? "outline" : "default"}
              className="flex items-center space-x-2"
            >
              <Wallet className="h-4 w-4" />
              <span>{connected ? "Disconnect" : "Connect Wallet"}</span>
            </Button>
            
            {/* Wallet Selection Dropdown */}
            {!connected && showWalletDropdown && wallets && wallets.length > 0 && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                <div className="py-1">
                  {wallets.map((wallet, index) => (
                    <button
                      key={index}
                      onClick={() => handleWalletSelect(wallet.name)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Wallet className="h-4 w-4" />
                      <span>{wallet.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
