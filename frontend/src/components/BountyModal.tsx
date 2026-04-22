import { useWallet } from "@/context/WalletContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ShieldAlert, Check, ArrowRight, CreditCard, Lock } from "lucide-react";
import { useState } from "react";
import { useFaucet, simulateSwapXlmToBnty, approveEscrow, createBountyOnChain, createTrustline } from "@/lib/stellar";

interface BountyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BountyModal({ isOpen, onClose }: BountyModalProps) {
  const { address, connect } = useWallet();
  const [step, setStep] = useState(0); // 0: Form, 1: Trustline, 2: Swap, 3: Approve, 4: Deploying
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleNextStep = async () => {
    setLoading(true);
    try {
      if (step === 1) {
        console.log("Establishing trustline...");
        await createTrustline();
        console.log("Requesting faucet tokens...");
        await useFaucet();
        setStep(2);
      } else if (step === 2) {
        await simulateSwapXlmToBnty(reward);
        setStep(3);
      } else if (step === 3) {
        await approveEscrow(reward);
        setStep(4);
      } else if (step === 4) {
        // Real On-Chain Creation
        const { id, xdr } = await createBountyOnChain(reward, deadline, title, description);
        
        // Sync to MongoDB with the real contractBountyId
        const res = await fetch("/api/bounties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contractBountyId: id,
            poster: address, 
            title,
            reward,
            deadline: `${deadline} days left`,
            description,
            status: "Active",
            creationTxHash: xdr
          })
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to save bounty to database");
        }

        if (res.ok) {
          onClose();
          window.location.reload();
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInitial = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(1);
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
              <h2 className="text-3xl font-black gradient-text">
                {step === 0 && "Create Bounty"}
                {step === 1 && "Setup Trustline"}
                {step === 2 && "Convert XLM"}
                {step === 3 && "Authorize Payout"}
                {step === 4 && "Finalizing"}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {step === 0 ? (
              <form onSubmit={handleSubmitInitial} className="space-y-6 relative">
                {!address && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 rounded-2xl flex flex-col items-center justify-center text-center p-6 border border-white/5">
                    <ShieldAlert size={48} className="text-yellow-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
                    <p className="text-sm text-gray-400 mb-6">You must be signed in with Freighter to post a bounty.</p>
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
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-widest pl-1">Bounty Title</label>
                  <input 
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Build an NFT Marketplace"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-500 tracking-widest pl-1">Reward (BNTY)</label>
                    <input 
                      type="number"
                      required
                      value={reward}
                      onChange={(e) => setReward(e.target.value)}
                      placeholder="1000"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-500 tracking-widest pl-1">Deadline (Days)</label>
                    <input 
                      type="number"
                      required
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      placeholder="7"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-widest pl-1">Description</label>
                  <textarea 
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the task and requirements..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                <button 
                  disabled={loading}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                >
                  <ArrowRight size={20} />
                  Continue to On-Chain Setup
                </button>
              </form>
            ) : (
              <div className="space-y-8">
                <div className="flex justify-between mb-12">
                  <StepIndicator current={step} target={1} icon={<Check />} label="Trustline" />
                  <StepIndicator current={step} target={2} icon={<CreditCard />} label="Swap" />
                  <StepIndicator current={step} target={3} icon={<Lock />} label="Approve" />
                  <StepIndicator current={step} target={4} icon={<Send />} label="Deploy" />
                </div>

                <div className="text-center p-8 glass rounded-3xl border border-white/5 bg-white/5">
                  <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                    {step === 1 && <Check size={40} />}
                    {step === 2 && <CreditCard size={40} />}
                    {step === 3 && <Lock size={40} />}
                    {step === 4 && <Send size={40} />}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">
                    {step === 1 && "Confirm BNTY Trustline"}
                    {step === 2 && "Swap XLM for BNTY"}
                    {step === 3 && "Approve Escrow Access"}
                    {step === 4 && "Deploying to Soroban"}
                  </h3>
                  <p className="text-gray-400 text-sm mb-8">
                    {step === 1 && "You need to sign a transaction to enable the BNTY token in your wallet."}
                    {step === 2 && `You will convert XLM to ${reward} BNTY for the bounty reward.`}
                    {step === 3 && "Grant the Escrow contract permission to hold the BNTY reward safely."}
                    {step === 4 && "Finalizing the bounty on the Stellar Soroban network..."}
                  </p>

                  {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-mono break-all">
                      {error}
                    </div>
                  )}

                  <button 
                    disabled={loading}
                    onClick={handleNextStep}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={20} />
                        {step === 4 ? "Complete Deployment" : "Sign with Freighter"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StepIndicator({ current, target, icon, label }: any) {
  const active = current >= target;
  const pulse = current === target;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
        active ? "bg-blue-600 text-white" : "bg-white/5 text-gray-500"
      } ${pulse ? "ring-4 ring-blue-500/20 animate-pulse" : ""}`}>
        {active && current > target ? <Check size={18} /> : icon}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-tighter ${active ? "text-white" : "text-gray-500"}`}>{label}</span>
    </div>
  );
}
