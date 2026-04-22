import { useWallet } from "@/context/WalletContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { submitWorkOnChain, createTrustline } from "@/lib/stellar";

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bountyId: string;
  bountyTitle: string;
}

export default function SubmissionModal({ isOpen, onClose, bountyId, bountyTitle }: SubmissionModalProps) {
  const { address, connect } = useWallet();
  const [loading, setLoading] = useState(false);
  const [ipfsLink, setIpfsLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // 0. Ensure trustline exists (Required for Classic Assets)
      console.log("Ensuring BNTY trustline...");
      await createTrustline();

      // 1. Submit on-chain first
      await submitWorkOnChain(Number(bountyId), ipfsLink);
      
      // 2. Sync to DB
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bountyId,
          hunter: address, 
          ipfsLink,
        })
      });

      if (res.ok) {
        onClose();
        alert("Submission successful!");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 glass rounded-t-[40px] p-8 pb-12 z-[101] max-w-2xl mx-auto border-t border-white/20 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black gradient-text">Submit Work</h2>
                <p className="text-gray-400 text-sm mt-1">For: {bountyTitle}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative">
              {!address && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 rounded-2xl flex flex-col items-center justify-center text-center p-6 border border-white/5">
                  <ShieldAlert size={48} className="text-yellow-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
                  <p className="text-sm text-gray-400 mb-6">You must be signed in with Freighter to submit work.</p>
                  <button 
                    type="button"
                    onClick={connect}
                    className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-xl font-bold transition-all"
                  >
                    Connect Now
                  </button>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 tracking-widest pl-1">IPFS Solution Link</label>
                <input 
                  required
                  value={ipfsLink}
                  onChange={(e) => setIpfsLink(e.target.value)}
                  placeholder="ipfs://..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <p className="text-xs text-blue-400 leading-relaxed">
                  Tip: Ensure your code or design is uploaded to a decentralized storage provider before submitting. We recommend using Pinata or Infura.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-mono break-all">
                  {error}
                </div>
              )}

              <button 
                disabled={loading}
                className="w-full py-5 bg-green-600 hover:bg-green-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Submit to Blockchain
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
