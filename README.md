# Bug Bounty: Decentralized Bounty Platform on Stellar 🌌

[![CI](https://github.com/akshayisdumb101-cloud/bugounty/actions/workflows/ci.yml/badge.svg)](https://github.com/akshayisdumb101-cloud/bugounty/actions)

**Live App**: [https://bug-bounty.vercel.app/](https://bug-bounty.vercel.app/)

Bug Bounty is a high-end, decentralized bounty platform built on Stellar Soroban. It enables trustless task management through an inter-contract escrow architecture, combined with a high-performance MongoDB indexing layer for a premium, low-latency user experience.

## 🚀 Key Features
- **🌐 Hybrid On-Chain/Off-Chain Architecture**: Secure fund management on Soroban with real-time indexing via MongoDB.
- **🛡️ Multi-Step Deployment Wizard**: Secure bounty posting flow including automated Trustlines, XLM-to-BNTY conversion, and Payout Authorization.
- **📊 Personalized Dashboard**: Advanced management portal for posters to review work (via IPFS) and hunters to track earnings.
- **⚡ Automated Payouts**: One-click "Approve & Pay" triggers atomic cross-contract fund releases.

## 📱 Previews & Demo
| Screenshot: mobile responsive view (Feed) | Screenshot: mobile responsive view (Dashboard) |
|-----------|------------------|
| ![Mobile Feed](./screenshots/feed.png) | ![Dashboard](./screenshots/dashboard.png) |

### 🎥 Live Demo
https://github.com/akshayisdumb101-cloud/bugounty/raw/main/videos/demo.mov

## 🏗️ Technical Architecture
The platform consists of three core Soroban contracts and a synchronized metadata layer:

1. **BountyToken (`CA26J2YJNTDQONXOCUKHFTQ2SVY4ZHANVIF3VI45LLNT3MYX5KLUFDTJ`)**: SEP-41 utility token for rewards.
2. **Escrow (`CBNKNOG37YHDBIAZDMDDLR2CVZ2KVJKASOM2APWSIFZ5ECGIRS3A6B55`)**: A vault that holds funds and only releases them via `BountyBoard` authorized calls.
3. **BountyBoard (`CA3NRNACCQNILSO253SYYNWZBITCD4GVMMQBLEK2M4PV4YUTAXZONVYT`)**: The central engine handling submissions and atomic approvals.

### Inter-Contract Escrow (Atomic Release)
When a poster approves a submission, the BountyBoard contract triggers a cross-contract call to the Escrow contract.

<details>
<summary><b>Click to view the full BountyBoard Smart Contract</b></summary>

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, symbol_short};

mod test;

mod escrow {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/escrow.wasm"
    );
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bounty {
    pub poster: Address,
    pub reward: i128,
    pub deadline: u64,
    pub title: String,
    pub description: String,
    pub status: u32, // 0: Open, 1: Approved, 2: Disputed
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Submission {
    pub hunter: Address,
    pub ipfs_link: String,
    pub bounty_id: u32,
    pub approved: bool,
}

#[contract]
pub struct BountyBoard;

#[contractimpl]
impl BountyBoard {
    pub fn initialize(e: Env, escrow: Address, arbiter: Address) {
        if e.storage().instance().has(&symbol_short!("escrow")) {
            panic!("already initialized");
        }
        e.storage().instance().set(&symbol_short!("escrow"), &escrow);
        e.storage().instance().set(&symbol_short!("arbiter"), &arbiter);
        e.storage().instance().set(&symbol_short!("next_id"), &0u32);
    }

    pub fn create_bounty(e: Env, poster: Address, reward: i128, deadline: u64, title: String, description: String) -> u32 {
        poster.require_auth();
        
        let id: u32 = e.storage().instance().get(&symbol_short!("next_id")).unwrap();
        let escrow_addr: Address = e.storage().instance().get(&symbol_short!("escrow")).unwrap();
        
        let bounty = Bounty {
            poster: poster.clone(),
            reward,
            deadline,
            title,
            description,
            status: 0,
        };
        
        e.storage().persistent().set(&id, &bounty);
        e.storage().instance().set(&symbol_short!("next_id"), &(id + 1));
        
        // Trigger Escrow deposit: Transfer reward from poster to Escrow
        let escrow_client = escrow::Client::new(&e, &escrow_addr);
        escrow_client.deposit(&poster, &reward);
        
        id
    }

    pub fn submit_work(e: Env, hunter: Address, bounty_id: u32, ipfs_link: String) {
        hunter.require_auth();
        let submissions_key = (symbol_short!("subs"), bounty_id);
        let mut subs: Vec<Submission> = e.storage().persistent().get(&submissions_key).unwrap_or(Vec::new(&e));
        
        subs.push_back(Submission {
            hunter,
            ipfs_link,
            bounty_id,
            approved: false,
        });
        
        e.storage().persistent().set(&submissions_key, &subs);
    }

    pub fn approve_work(e: Env, bounty_id: u32, submission_index: u32, amount: i128) {
        let mut bounty: Bounty = e.storage().persistent().get(&bounty_id).expect("bounty not found");
        bounty.poster.require_auth();
        
        if bounty.status != 0 {
            panic!("bounty not open");
        }
        
        let submissions_key = (symbol_short!("subs"), bounty_id);
        let mut subs: Vec<Submission> = e.storage().persistent().get(&submissions_key).expect("no submissions");
        
        let mut sub = subs.get(submission_index).expect("submission not found");
        sub.approved = true;
        subs.set(submission_index, sub.clone());
        
        e.storage().persistent().set(&submissions_key, &subs);
        
        // Call Escrow release
        let escrow_addr: Address = e.storage().instance().get(&symbol_short!("escrow")).unwrap();
        let escrow_client = escrow::Client::new(&e, &escrow_addr);
        escrow_client.release(&sub.hunter, &amount);
    }
}
```
</details>

## 🛠️ Stack
- **Smart Contracts**: Rust + Soroban SDK
- **Frontend**: Next.js 16 (App Router) + Framer Motion
- **Database**: MongoDB (Secondary Indexing)
### Network Configuration
- **Network**: Stellar Testnet
- **BNTY Asset Code**: `BNTY`
- **BNTY Issuer**: `GC2GPSZ6XBU7VNVLNR3EHDUSVSKXFL7ZL2KJVLSFVKYU34KUURY5FAB7`
- **Token or pool address (if custom token or pool deployed)**: `CA26J2YJNTDQONXOCUKHFTQ2SVY4ZHANVIF3VI45LLNT3MYX5KLUFDTJ`

### Contract Addresses
- **Bounty Board**: `CA3NRNACCQNILSO253SYYNWZBITCD4GVMMQBLEK2M4PV4YUTAXZONVYT`
- **Escrow**: `CBNKNOG37YHDBIAZDMDDLR2CVZ2KVJKASOM2APWSIFZ5ECGIRS3A6B55`

**Deployment Transaction**: [View on Stellar Expert](https://stellar.expert/explorer/testnet/op/9385761967239169)

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
