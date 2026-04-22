"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { connectWallet } from "@/lib/stellar";

interface WalletContextType {
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  loading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if previously connected in this session
    const savedAddress = localStorage.getItem("bountifi_address");
    if (savedAddress) {
      setAddress(savedAddress);
    }
    setLoading(false);
  }, []);

  const connect = async () => {
    try {
      const pubKey = await connectWallet();
      if (pubKey) {
        setAddress(pubKey);
        localStorage.setItem("bountifi_address", pubKey);
      }
    } catch (e) {
      console.error("Connection failed", e);
    }
  };

  const disconnect = () => {
    setAddress(null);
    localStorage.removeItem("bountifi_address");
  };

  return (
    <WalletContext.Provider value={{ address, connect, disconnect, loading }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
