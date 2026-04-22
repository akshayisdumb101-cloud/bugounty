#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, String, symbol_short, Symbol};

#[contract]
pub struct BountyToken;

#[contractimpl]
impl BountyToken {
    pub fn initialize(e: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        if e.storage().instance().has(&symbol_short!("admin")) {
            panic!("already initialized");
        }
        e.storage().instance().set(&symbol_short!("admin"), &admin);
        e.storage().instance().set(&symbol_short!("decimal"), &decimal);
        e.storage().instance().set(&symbol_short!("name"), &name);
        e.storage().instance().set(&symbol_short!("symbol"), &symbol);
    }

    pub fn name(e: Env) -> String {
        e.storage().instance().get(&symbol_short!("name")).unwrap()
    }

    pub fn symbol(e: Env) -> String {
        e.storage().instance().get(&symbol_short!("symbol")).unwrap()
    }

    pub fn decimals(e: Env) -> u32 {
        e.storage().instance().get(&symbol_short!("decimal")).unwrap()
    }

    pub fn mint(e: Env, to: Address, amount: i128) {
        let admin: Address = e.storage().instance().get(&symbol_short!("admin")).unwrap();
        admin.require_auth();
        
        let balance: i128 = e.storage().persistent().get(&to).unwrap_or(0);
        e.storage().persistent().set(&to, &(balance + amount));
    }

    pub fn approve(e: Env, from: Address, spender: Address, amount: i128, _expiration_ledger: u32) {
        from.require_auth();
        let key = (symbol_short!("allow"), from, spender);
        e.storage().temporary().set(&key, &amount);
    }

    pub fn allowance(e: Env, from: Address, spender: Address) -> i128 {
        let key = (symbol_short!("allow"), from, spender);
        e.storage().temporary().get(&key).unwrap_or(0)
    }

    pub fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        let key = (symbol_short!("allow"), from.clone(), spender);
        let allowance: i128 = e.storage().temporary().get(&key).unwrap_or(0);
        if allowance < amount {
            panic!("insufficient allowance");
        }

        let from_balance: i128 = e.storage().persistent().get(&from).unwrap_or(0);
        if from_balance < amount {
            panic!("insufficient balance");
        }

        let to_balance: i128 = e.storage().persistent().get(&to).unwrap_or(0);
        
        e.storage().persistent().set(&from, &(from_balance - amount));
        e.storage().persistent().set(&to, &(to_balance + amount));
        e.storage().temporary().set(&key, &(allowance - amount));
    }

    pub fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        let from_balance: i128 = e.storage().persistent().get(&from).unwrap_or(0);
        if from_balance < amount {
            panic!("insufficient balance");
        }
        
        let to_balance: i128 = e.storage().persistent().get(&to).unwrap_or(0);
        
        e.storage().persistent().set(&from, &(from_balance - amount));
        e.storage().persistent().set(&to, &(to_balance + amount));
    }

    pub fn balance(e: Env, addr: Address) -> i128 {
        e.storage().persistent().get(&addr).unwrap_or(0)
    }

    pub fn faucet(e: Env, to: Address) {
        let amount: i128 = 100000000000; // 10,000 tokens (7 decimals)
        let balance: i128 = e.storage().persistent().get(&to).unwrap_or(0);
        e.storage().persistent().set(&to, &(balance + amount));
    }
}
