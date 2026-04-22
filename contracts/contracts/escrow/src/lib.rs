#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, symbol_short, token};

#[contract]
pub struct Escrow;

#[contractimpl]
impl Escrow {
    pub fn initialize(e: Env, token: Address, board: Address) {
        if e.storage().instance().has(&symbol_short!("token")) {
            panic!("already initialized");
        }
        e.storage().instance().set(&symbol_short!("token"), &token);
        e.storage().instance().set(&symbol_short!("board"), &board);
    }

    pub fn deposit(e: Env, from: Address, amount: i128) {
        let board: Address = e.storage().instance().get(&symbol_short!("board")).unwrap();
        board.require_auth(); // Only the board can trigger a deposit recorded by this contract logic
        
        let token: Address = e.storage().instance().get(&symbol_short!("token")).unwrap();
        let client = token::Client::new(&e, &token);
        
        // Use transfer_from to pull the approved funds from the user
        client.transfer_from(&e.current_contract_address(), &from, &e.current_contract_address(), &amount);
    }

    pub fn release(e: Env, winner: Address, amount: i128) {
        let board: Address = e.storage().instance().get(&symbol_short!("board")).unwrap();
        board.require_auth(); // Only the board can release funds
        
        let token: Address = e.storage().instance().get(&symbol_short!("token")).unwrap();
        let client = token::Client::new(&e, &token);
        
        // Transfer from this contract to winner
        client.transfer(&e.current_contract_address(), &winner, &amount);
    }
}
