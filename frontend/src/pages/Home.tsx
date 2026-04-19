import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { buyNFT } from '../utils/soroban';
import { Tag, ShoppingCart, Loader2, CheckCircle2 } from 'lucide-react';

interface NFT {
  _id: string;
  tokenId: number;
  name: string;
  image: string;
  owner: string;
  contractId: string;
  price?: string;
  listed?: boolean;
}

const Home = () => {
  const { address, sign } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/api/nfts`);
        if (res.ok) {
          const data = await res.json();
          // Filter out any invalid items (like entries with "..." from unconfigured backends)
          setNfts(data
            .filter((item: any) => item.contractId && item.contractId !== '...')
            .map((item: any) => ({
              ...item,
              id: item.tokenId.toString(),
              name: item.name || `Stellar NFT #${item.tokenId}`,
              image: item.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600',
              listed: true 
            })));
        }
      } catch (e) {
        console.error("Failed to fetch from backend", e);
        // Fallback to mock data for demo if backend is not running
        setNfts([
          { 
            _id: '1', 
            tokenId: 1, 
            id: '1', 
            name: 'Stellar Explorer #01', 
            image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=600', 
            price: '500 XLM', 
            listed: true, 
            owner: 'GAKF...4TIV', 
            contractId: 'CAAERVDMPWVEOVRO24OZRT7MTQU4Q3FACQ3ABZVWXQR5TSSXH3FOEL7A' // Use the real NFT ID we deployed
          },
        ] as any);
      } finally {
        setLoading(false);
      }
    };
    fetchNFTs();
  }, []);

  const handleBuy = async (nft: NFT) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    setProcessingId(nft._id);
    try {
      const result = await buyNFT(address, nft.contractId, nft.tokenId, sign);
      alert(`Success! Transaction submitted. Hash: ${result.hash}`);
      setNfts(prev => prev.map(item => item._id === nft._id ? { ...item, listed: false } : item));
    } catch (e: any) {
      alert(`Purchase failed: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black">Marketplace</h1>
          <p className="text-slate-400 mt-2">Data indexed directly from Soroban to MongoDB</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {nfts.map((nft) => (
          <div key={nft._id} className="glass rounded-[2rem] overflow-hidden card-hover group h-full flex flex-col">
            <div className="aspect-square overflow-hidden relative">
              <img src={nft.image} alt={nft.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              {nft.listed && (
                <div className="absolute top-4 right-4 bg-blue-600/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg border border-white/20">
                  <Tag size={12} /> Listed
                </div>
              )}
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xl truncate">{nft.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Owner {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}</p>
              </div>
              
              <div className="mt-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Price</p>
                  <p className="font-black text-xl text-blue-400">
                    {nft.price ? nft.price.replace(' XLM', '') : '100'} XLM
                  </p>
                </div>
                
                {nft.listed && (
                  <button 
                    onClick={() => handleBuy(nft)}
                    disabled={processingId !== null}
                    className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-500 transition-all card-hover shadow-lg shadow-blue-600/20 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === nft._id ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      <ShoppingCart size={24} />
                    )}
                  </button>
                )}
                
                {!nft.listed && (
                   <div className="bg-slate-800/50 p-2 rounded-xl text-slate-500">
                      <CheckCircle2 size={20} />
                   </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
