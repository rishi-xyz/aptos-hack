"use client"

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { ReactNode } from "react";

export const AptosProvider = ({ children }: { children: ReactNode }) => {    
    return (
        <AptosWalletAdapterProvider
            autoConnect={true}
            dappConfig={{ network: Network.TESTNET, aptosApiKeys: { [Network.TESTNET]: process.env.APTOS_API_KEY! } }}
            onError={(error) => {
                console.error("Wallet error:", error);
            }}
        >
            {children}
        </AptosWalletAdapterProvider>
    );
};