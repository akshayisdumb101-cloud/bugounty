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
