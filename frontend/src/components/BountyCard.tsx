"use client";

import { motion } from "framer-motion";
import { Clock, Coins, ChevronRight } from "lucide-react";

interface BountyProps {
  title: string;
  reward: string;
  deadline: string;
  poster: string;
  status: string;
}

export default function BountyCard({ title, reward, deadline, poster, status }: BountyProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="glass p-6 rounded-3xl group cursor-pointer relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="text-blue-400" />
      </div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1 group-hover:text-blue-400 transition-colors">{title}</h3>
          <p className="text-sm text-gray-500 font-mono">Posted by {poster.slice(0, 6)}...{poster.slice(-4)}</p>
        </div>
        <div className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          {status}
        </div>
      </div>

      <div className="flex gap-6 mt-8">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Coins size={16} className="text-yellow-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-500 font-bold">Reward</p>
            <p className="font-bold text-lg">{reward} BNTY</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Clock size={16} className="text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-500 font-bold">Deadline</p>
            <p className="font-bold">{deadline}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: "65%" }} // Simulation of progress
          transition={{ duration: 1, delay: 0.5 }}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button 
          className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // We'll pass the opening logic via a prop if needed, or handle it in parent
          }}
        >
          View Details
        </button>
      </div>
    </motion.div>
  );
}
