"use client";

import Navbar from "@/components/Navbar";
import BountyCard from "@/components/BountyCard";
import BountyModal from "@/components/BountyModal";
import SubmissionModal from "@/components/SubmissionModal";
import { Plus, Flame, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<any>(null);
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bounties")
      .then((res) => res.json())
      .then((data) => {
        // Pure Testnet: Only show bounties that were officially deployed to the blockchain
        const liveBounties = (data || []).filter((b: any) => b.creationTxHash);
        setBounties(liveBounties);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen pt-32 pb-20 px-4">
      <Navbar />
      <BountyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <SubmissionModal 
        isOpen={isSubModalOpen} 
        onClose={() => setIsSubModalOpen(false)} 
        bountyId={selectedBounty?.contractBountyId}
        bountyTitle={selectedBounty?.title}
      />
      
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Flame size={20} className="text-blue-500" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-blue-500">Trending Bounties</span>
          </motion.div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6">
            Empowering the <br />
            <span className="gradient-text">Stellar Ecosystem.</span>
          </h1>
          
          <p className="text-gray-400 text-lg max-w-2xl">
            The decentralized destination for Stellar developers. Post task, secure rewards in escrow, and build the future of finance.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="glass h-[300px] animate-pulse rounded-3xl" />
            ))
          ) : (
            bounties.map((bounty, i) => (
              <div key={i} onClick={() => {
                if (bounty.status === "Approved") {
                  alert("This bounty has already been completed and is closed for submissions.");
                  return;
                }
                setSelectedBounty(bounty);
                setIsSubModalOpen(true);
              }}>
                <BountyCard {...bounty} />
              </div>
            ))
          )}
          
          <motion.button 
            onClick={() => setIsModalOpen(true)}
            whileHover={{ scale: 1.02 }}
            className="border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 text-gray-500 hover:text-white hover:border-white/30 transition-all min-h-[300px]"
          >
            <div className="p-4 bg-white/5 rounded-full">
              <Plus size={32} />
            </div>
            <span className="font-bold">Post New Bounty</span>
          </motion.button>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-8 right-8 md:hidden">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30"
        >
          <Plus className="text-white" />
        </button>
      </div>
    </main>
  );
}
