# BountiFi: Decentralized Bounty Platform on Stellar 🌌

[![CI](https://github.com/saasflare-online/chainnft/actions/workflows/ci.yml/badge.svg)](https://github.com/saasflare-online/chainnft/actions)

BountiFi is a high-end, decentralized bounty platform built on Stellar Soroban. It enables trustless task management through an inter-contract escrow architecture, combined with a high-performance MongoDB indexing layer for a premium, low-latency user experience.

## 🚀 Key Features
- **🌐 Hybrid On-Chain/Off-Chain Architecture**: Secure fund management on Soroban with real-time indexing via MongoDB.
- **🛡️ Multi-Step Deployment Wizard**: Secure bounty posting flow including automated Trustlines, XLM-to-BNTY conversion, and Payout Authorization.
- **📊 Personalized Dashboard**: Advanced management portal for posters to review work (via IPFS) and hunters to track earnings.
- **⚡ Automated Payouts**: One-click "Approve & Pay" triggers atomic cross-contract fund releases.

## 📱 Mobile Preview
| Feed View | Dashboard View |
|-----------|------------------|
| ![Mobile Feed](https://placehold.co/300x600/0a0a0a/3b82f6?text=Bounty+Feed) | ![Dashboard](https://placehold.co/300x600/0a0a0a/10b981?text=User+Dashboard) |

## 🏗️ Technical Architecture
The platform consists of three core Soroban contracts and a synchronized metadata layer:

1. **BountyToken (`CD...TOKEN`)**: SEP-41 utility token for rewards.
2. **Escrow (`CD...ESCROW`)**: A vault that holds funds and only releases them via `BountyBoard` authorized calls.
3. **BountyBoard (`CD...BOARD`)**: The central engine handling submissions and atomic approvals.

### Inter-Contract Escrow (Atomic Release)
When a poster approves a submission, the BountyBoard contract triggers a cross-contract call to the Escrow contract:

```rust
// BountyBoard.rs
let escrow_client = escrow::Client::new(&e, &escrow_addr);
escrow_client.release(&winner, &reward);
```

## 🛠️ Stack
- **Smart Contracts**: Rust + Soroban SDK
- **Frontend**: Next.js 16 (App Router) + Framer Motion
- **Database**: MongoDB (Secondary Indexing)
### Network Configuration
- **Network**: Stellar Testnet
- **BNTY Asset Code**: `BNTY`
- **BNTY Issuer**: `GC2GPSZ6XBU7VNVLNR3EHDUSVSKXFL7ZL2KJVLSFVKYU34KUURY5FAB7`
- **BNTY Soroban Wrapper**: `CA26J2YJNTDQONXOCUKHFTQ2SVY4ZHANVIF3VI45LLNT3MYX5KLUFDTJ`

### Contract Addresses
- **Bounty Board**: `CA3NRNACCQNILSO253SYYNWZBITCD4GVMMQBLEK2M4PV4YUTAXZONVYT`
- **Escrow**: `CBNKNOG37YHDBIAZDMDDLR2CVZ2KVJKASOM2APWSIFZ5ECGIRS3A6B55`

## 🏃 Local Development

1. **Contracts**:
   ```bash
   cd contracts
   stellar contract build
   stellar contract test
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📜 License
MIT


---
Triggering Vercel rebuild after git cleanup.
