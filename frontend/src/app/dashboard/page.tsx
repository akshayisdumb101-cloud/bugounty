"use client";

import { useWallet } from "@/context/WalletContext";
import Navbar from "@/components/Navbar";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Package, 
  Users, 
  DollarSign, 
  ExternalLink, 
  ChevronDown, 
  CheckCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { approveWorkOnChain } from "@/lib/stellar";

export default function Dashboard() {
  const { address, loading: authLoading } = useWallet();
  const [postedBounties, setPostedBounties] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !address) {
      router.push("/");
    }
  }, [address, authLoading, router]);

  useEffect(() => {
    if (address) {
      const fetchData = async () => {
        try {
          const [bReq, sReq] = await Promise.all([
            fetch(`/api/bounties?poster=${address}`),
            fetch(`/api/submissions?hunter=${address}`)
          ]);
          const [bData, sData] = await Promise.all([
            bReq.json(),
            sReq.json()
          ]);
          // Pure Testnet: Filter dashboard data
          setPostedBounties((bData || []).filter((b: any) => b.creationTxHash));
          setSubmissions(sData || []);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [address]);

  const handleApprove = async (subId: string, hunter: string, contractBountyId: string | number, onChainIndex: number, amount: string) => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Please enter a valid payout amount.");
      return;
    }

    if (contractBountyId === undefined || contractBountyId === null) {
      alert("Error: This bounty is missing its on-chain ID. It may have been created during a simulation phase. Please create a new bounty to test payouts.");
      return;
    }

    if (onChainIndex === undefined || onChainIndex === null || isNaN(Number(onChainIndex))) {
      alert("Error: This submission is missing its on-chain index. It was likely created before the indexing system was live. Please submit a new answer to this bounty to test payouts.");
      return;
    }

    if (!confirm(`Are you sure you want to approve this submission? This will release the funds to ${hunter}.`)) return;

    try {
      // 1. Trigger Contract Call (On-Chain)
      const txResult = await approveWorkOnChain(Number(contractBountyId), Number(onChainIndex), amount);
      console.log("On-chain approval result:", txResult);

      // 2. Update Database
      const res = await fetch(`/api/submissions/${subId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posterAddress: address })
      });

      if (res.ok) {
        alert("Payment released successfully!");
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      alert("Error approving submission: " + (e as any).message);
    }
  };

  if (authLoading || !address) return null;

  return (
    <main className="min-h-screen pt-32 pb-20 px-4">
      <Navbar />
      
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-black mb-2">My Dashboard</h1>
          <p className="text-gray-400 font-mono text-sm">{address}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard title="Total Posted" value={postedBounties.length} icon={<Package className="text-blue-500" />} />
          <StatCard title="My Submissions" value={submissions.length} icon={<Users className="text-purple-500" />} />
          <StatCard title="Total Earnings" value="0.00 BNTY" icon={<DollarSign className="text-green-500" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Package size={24} className="text-blue-500" />
              Bounties I Posted
            </h2>
            <div className="space-y-4">
              {postedBounties.length === 0 ? (
                <EmptyState message="No bounties posted yet." />
              ) : (
                postedBounties.map((b: any, i) => (
                  <DashboardItem 
                    key={i} 
                    title={b.title} 
                    subtitle={b.reward + " BNTY"} 
                    status={b.status} 
                    bountyId={b.contractBountyId}
                    creationTxHash={b.creationTxHash}
                    isPoster={true}
                    onApprove={handleApprove}
                  />
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Users size={24} className="text-purple-500" />
              My Submissions
            </h2>
            <div className="space-y-4">
              {submissions.length === 0 ? (
                <EmptyState message="No submissions made yet." />
              ) : (
                submissions.map((s, i) => (
                  <DashboardItem 
                    key={i} 
                    title={s.ipfsLink.slice(0, 30) + "..."} 
                    subtitle={"Bounty ID: " + s.bountyId} 
                    status={s.approved ? "Approved" : "Pending"} 
                    link={s.ipfsLink}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="glass p-6 rounded-3xl">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/5 rounded-2xl">{icon}</div>
      </div>
      <div>
        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-black mt-1">{value}</p>
      </div>
    </div>
  );
}

function DashboardItem({ title, subtitle, status, link, bountyId, isPoster, onApprove, creationTxHash }: any) {
  const [showSubs, setShowSubs] = useState(false);
  const [subs, setSubs] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [payoutAmounts, setPayoutAmounts] = useState<Record<string, string>>({});


  const fetchSubs = async () => {
    if (!showSubs && isPoster && bountyId !== undefined && bountyId !== null) {
      setLoadingSubs(true);
      try {
        const res = await fetch(`/api/submissions?bountyId=${bountyId}`);
        setSubs(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSubs(false);
      }
    }
    setShowSubs(!showSubs);
  };

  return (
    <div className="space-y-2">
      <div 
        onClick={fetchSubs}
        className="glass p-4 rounded-2xl flex justify-between items-center group hover:bg-white/[0.05] transition-colors cursor-pointer"
      >
        <div>
          <h4 className="font-bold group-hover:text-blue-400 transition-colors flex items-center gap-2">
            {title}
            {(link || isPoster) && <ExternalLink size={14} className="text-gray-500" />}
          </h4>
          <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-tighter">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${
            status === "Approved" || status === "Active" ? "bg-blue-500/10 text-blue-400" : "bg-yellow-500/10 text-yellow-400"
          }`}>
            {status}
          </div>
          {isPoster && (
            <ChevronDown size={18} className={`text-gray-500 transition-transform ${showSubs ? "rotate-180" : ""}`} />
          )}
        </div>
      </div>

      {showSubs && isPoster && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="pl-6 space-y-3 overflow-hidden"
        >
          {loadingSubs ? (
            <div className="text-xs text-gray-500 animate-pulse">Loading submissions...</div>
          ) : subs.length === 0 ? (
            <div className="text-xs text-gray-500 italic">No submissions yet.</div>
          ) : (
            subs.map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-gray-300">{s.hunter.slice(0, 8)}...{s.hunter.slice(-8)}</p>
                  <a href={s.ipfsLink} target="_blank" className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 mt-1">
                    <ExternalLink size={10} />
                    View Work (IPFS)
                  </a>
                </div>
                {!s.approved && status !== "Approved" && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      placeholder="Amt"
                      value={payoutAmounts[s._id] || ""}
                      onChange={(e) => setPayoutAmounts(prev => ({ ...prev, [s._id]: e.target.value }))}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] w-16 focus:outline-none focus:border-blue-500"
                    />
                    <button 
                      onClick={() => onApprove(s._id, s.hunter, bountyId, s.onChainIndex, payoutAmounts[s._id])}
                      className="bg-green-600 hover:bg-green-700 text-[10px] font-black px-4 py-2 rounded-lg uppercase transition-all"
                    >
                      Approve & Pay
                    </button>
                  </div>
                )}
                {s.approved && (
                  <div className="text-[10px] font-black text-green-500 uppercase flex items-center gap-1">
                    <CheckCircle size={12} />
                    Winner
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
      <p className="text-gray-500 font-medium">{message}</p>
    </div>
  );
}
