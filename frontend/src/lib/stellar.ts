import { 
  getAddress, 
  signTransaction, 
  isConnected 
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";

// Deconstruct from the single namespace for prototype consistency
const { 
  TransactionBuilder, 
  rpc, 
  Address, 
  Contract, 
  BASE_FEE, 
  TimeoutInfinite, 
  Operation, 
  nativeToScVal 
} = StellarSdk;

export const RPC_URL = "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const server = new rpc.Server(RPC_URL);

export const BNTY_ISSUER = "GC2GPSZ6XBU7VNVLNR3EHDUSVSKXFL7ZL2KJVLSFVKYU34KUURY5FAB7";
export const BNTY_ASSET = new StellarSdk.Asset("BNTY", BNTY_ISSUER);

export const CONTRACT_IDS = {
  // Official Soroban Wrapper for BNTY Classic Asset
  BOUNTY_TOKEN: "CA26J2YJNTDQONXOCUKHFTQ2SVY4ZHANVIF3VI45LLNT3MYX5KLUFDTJ", 
  ESCROW: "CBWNIZN74EJFJ77GFW3RNDGRCKZL4TOPVA4XGQMYF7CMRPUIT7ZA4KNL",
  BOUNTY_BOARD: "CCEMX4RYOES4ZMM3EMZEJ7AB3IRWVPHSJNBU6LLXGWLB7V2VAZNOVFSD"
};

export async function connectWallet() {
  if (await isConnected()) {
    const { address } = await getAddress();
    return address;
  }
  throw new Error("Freighter not found");
}

async function waitForTransaction(txHash: string) {
  let iterations = 0;
  while (iterations < 30) { // 30 * 2s = 60s
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
      const txResponse = await server.getTransaction(txHash);
      const status = txResponse.status;
      
      if (status === "SUCCESS") {
        console.log("Transaction confirmed:", txHash);
        return txResponse;
      } else if (status === "FAILED") {
        throw new Error(`Transaction failed: ${JSON.stringify(txResponse.resultXdr)}`);
      }
      // If PENDING or NOT_FOUND, keep waiting
      console.log(`Waiting for transaction ${txHash}... status: ${status}`);
    } catch (e: any) {
      console.warn("Polling error:", e.message);
    }
    iterations++;
  }
  throw new Error("Transaction timed out after 60s. Please check your wallet for status.");
}

async function signAndSubmit(tx: any) {
  console.log("Requesting signature...");
  const freighterResponse: any = await signTransaction(tx.toXDR(), { 
    networkPassphrase: NETWORK_PASSPHRASE
  });

  if (freighterResponse.error) {
    throw new Error(`Signing failed: ${freighterResponse.error}`);
  }

  // Extract the raw string from the Freighter object (Fixes 'invalid parameters')
  const signedXdr = freighterResponse.signedTxXdr || freighterResponse;

  console.log("Submitting transaction via direct RPC...");
  const sendResponse = await server.sendTransaction(
    new StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as any
  );
  
  if (sendResponse.status === "ERROR") {
    throw new Error(`RPC Error: ${JSON.stringify(sendResponse.errorResult)}`);
  }
  
  console.log("Transaction submitted, waiting for confirmation...");
  const txResponse = await waitForTransaction(sendResponse.hash);
  return { hash: sendResponse.hash, ...txResponse };
}

export async function approveWorkOnChain(bountyId: number, subIndex: number, amount: string) {
  const BOARD_ID = CONTRACT_IDS.BOUNTY_BOARD;
  console.log("On-chain approval start:", { bountyId, subIndex, amount, board: BOARD_ID });

  const { address } = await getAddress();
  if (!address) throw new Error("Wallet not connected");
  
  const account = await server.getAccount(address);
  const contract = new Contract(BOARD_ID);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "approve_work",
        nativeToScVal(Number(bountyId), { type: "u32" }),
        nativeToScVal(Number(subIndex), { type: "u32" }),
        nativeToScVal(BigInt(Math.floor(Number(amount) * 10000000)), { type: "i128" })
      )
    )
    .setTimeout(TimeoutInfinite)
    .build();

  console.log("Simulating transaction...");
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`Simulation failed: ${sim.error}`);

  tx = rpc.assembleTransaction(tx, sim).build();
  return await signAndSubmit(tx);
}

export async function submitWorkOnChain(bountyId: number, ipfsLink: string) {
  const BOARD_ID = CONTRACT_IDS.BOUNTY_BOARD;
  console.log("Submitting work on-chain:", { bountyId, ipfsLink, board: BOARD_ID });

  const { address } = await getAddress();
  if (!address) throw new Error("Wallet not connected");
  
  const account = await server.getAccount(address);
  const contract = new Contract(BOARD_ID);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "submit_work",
        Address.fromString(address).toScVal(), // hunter
        nativeToScVal(Number(bountyId), { type: "u32" }),
        nativeToScVal(ipfsLink, { type: "string" })
      )
    )
    .setTimeout(TimeoutInfinite)
    .build();

  console.log("Simulating submission...");
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`Submission simulation failed: ${sim.error}`);

  tx = rpc.assembleTransaction(tx, sim).build();
  return await signAndSubmit(tx);
}

export async function approveEscrow(amount: string) {
  const { address } = await getAddress();
  if (!address) throw new Error("Wallet not connected");

  const account = await server.getAccount(address);
  const tokenContract = new Contract(CONTRACT_IDS.BOUNTY_TOKEN);
  
  // Get current ledger to set a safe expiration for the allowance
  const status = await server.getLatestLedger();
  const expirationLedger = status.sequence + 50000; // ~7 hours in future

  console.log(`Approving Escrow to spend ${amount} BNTY until ledger ${expirationLedger}...`);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      tokenContract.call(
        "approve",
        Address.fromString(address).toScVal(), // from
        Address.fromString(CONTRACT_IDS.ESCROW).toScVal(), // spender
        nativeToScVal(BigInt(Math.floor(Number(amount) * 10000000)), { type: "i128" }), // amount
        nativeToScVal(expirationLedger, { type: "u32" }) // expiration_ledger
      )
    )
    .setTimeout(TimeoutInfinite)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`Approval simulation failed: ${sim.error}`);
  
  tx = rpc.assembleTransaction(tx, sim).build();
  return await signAndSubmit(tx);
}

export async function createBountyOnChain(reward: string, deadline: string, title: string, description: string) {
  const { address } = await getAddress();
  if (!address) throw new Error("Wallet not connected");

  const account = await server.getAccount(address);
  const boardContract = new Contract(CONTRACT_IDS.BOUNTY_BOARD);

  console.log("Creating bounty on-chain...");

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      boardContract.call(
        "create_bounty",
        Address.fromString(address).toScVal(), // poster
        nativeToScVal(BigInt(Math.floor(Number(reward) * 10000000)), { type: "i128" }),
        nativeToScVal(Number(deadline), { type: "u64" }),
        nativeToScVal(title, { type: "string" }),
        nativeToScVal(description, { type: "string" })
      )
    )
    .setTimeout(TimeoutInfinite)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`Creation simulation failed: ${sim.error}`);
  
  tx = rpc.assembleTransaction(tx, sim).build();
  const result = await signAndSubmit(tx);
  
  // Extract the bounty ID from the simulation or result (sim is easier)
  if (sim.result) {
    const id = StellarSdk.scValToNative(sim.result.retval);
    return { id, xdr: result.hash };
  }
  
  return { id: 0, xdr: result.hash };
}

export async function createTrustline() {
  const { address } = await getAddress();
  if (!address) throw new Error("Wallet not connected");

  console.log("Creating Trustline for Classic BNTY...");
  const account = await server.getAccount(address);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({
        asset: BNTY_ASSET,
      })
    )
    .setTimeout(TimeoutInfinite)
    .build();

  return await signAndSubmit(tx);
}

export async function simulateSwapXlmToBnty(amount: string) {
  // Pure Testnet: Preparing token acquisition.
  console.log(`Stellar Testnet: Acquiring ${amount} BNTY for transaction...`);
  return { success: true };
}

export async function useFaucet() {
  const { address } = await getAddress();
  if (!address) throw new Error("Wallet not connected");

  console.log("Requesting Classic BNTY from Faucet...");
  
  // We'll use a server-side route to issue tokens from our new issuer
  const res = await fetch("/api/faucet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Faucet failed");
  }

  return await res.json();
}

export async function initializeContracts() {
  const { address } = await getAddress();
  if (!address) throw new Error("Wallet not connected");

  const account = await server.getAccount(address);
  const userAddr = Address.fromString(address);

  console.log("Initializing all contracts...");

  // 1. Initialize Token
  const tokenContract = new Contract(CONTRACT_IDS.BOUNTY_TOKEN);
  let txToken = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(tokenContract.call("initialize", userAddr.toScVal(), nativeToScVal(7, { type: "u32" }), nativeToScVal("BountyToken", { type: "string" }), nativeToScVal("BNTY", { type: "string" })))
    .setTimeout(TimeoutInfinite).build();
  
  try {
    const simToken = await server.simulateTransaction(txToken);
    if (!rpc.Api.isSimulationError(simToken)) {
      txToken = rpc.assembleTransaction(txToken, simToken).build();
      await signAndSubmit(txToken);
      console.log("Token initialized.");
    } else {
      console.log("Token likely already initialized.");
    }
  } catch (e) { console.log("Token init skipped or failed."); }

  // 2. Initialize Board
  const boardContract = new Contract(CONTRACT_IDS.BOUNTY_BOARD);
  let txBoard = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(boardContract.call("initialize", Address.fromString(CONTRACT_IDS.ESCROW).toScVal(), userAddr.toScVal()))
    .setTimeout(TimeoutInfinite).build();

  try {
    const simBoard = await server.simulateTransaction(txBoard);
    if (!rpc.Api.isSimulationError(simBoard)) {
      txBoard = rpc.assembleTransaction(txBoard, simBoard).build();
      await signAndSubmit(txBoard);
      console.log("Board initialized.");
    } else {
      console.log("Board likely already initialized.");
    }
  } catch (e) { console.log("Board init skipped or failed."); }

  // 3. Initialize Escrow
  const escrowContract = new Contract(CONTRACT_IDS.ESCROW);
  let txEscrow = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(escrowContract.call("initialize", Address.fromString(CONTRACT_IDS.BOUNTY_TOKEN).toScVal(), Address.fromString(CONTRACT_IDS.BOUNTY_BOARD).toScVal()))
    .setTimeout(TimeoutInfinite).build();

  try {
    const simEscrow = await server.simulateTransaction(txEscrow);
    if (!rpc.Api.isSimulationError(simEscrow)) {
      txEscrow = rpc.assembleTransaction(txEscrow, simEscrow).build();
      await signAndSubmit(txEscrow);
      console.log("Escrow initialized.");
    } else {
      console.log("Escrow likely already initialized.");
    }
  } catch (e) { console.log("Escrow init skipped or failed."); }

  console.log("Initialization sequence complete.");
}
