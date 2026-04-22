"use client";

import { useWallet } from "@/context/WalletContext";
import { Wallet, LogOut, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const { address, connect, disconnect } = useWallet();

  return (
    <nav className="glass fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl px-8 py-4 rounded-full flex justify-between items-center z-50">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl" />
        <span className="text-xl font-bold gradient-text">BountiFi</span>
      </Link>

      <div className="flex items-center gap-4">
        {address ? (
          <>
            <Link 
              href="/dashboard"
              className="text-sm font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-2 mr-4"
            >
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
            
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <span className="text-sm font-mono text-gray-400">
                {address.slice(0, 4)}...{address.slice(-4)}
              </span>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={disconnect}
                className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <LogOut size={16} />
              </Button>
            </div>
          </>
        ) : (
          <Button 
            onClick={connect}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6 transition-all transform hover:scale-105"
          >
            <Wallet size={18} className="mr-2" />
            Connect Wallet
          </Button>
        )}
      </div>
    </nav>
  );
}

// Basic Button Component for layout
function Button({ children, onClick, className, variant, size }: any) {
  return (
    <button 
      onClick={onClick}
      className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
