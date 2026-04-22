
import { NextResponse } from "next/server";
import * as StellarSdk from "@stellar/stellar-sdk";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const RPC_URL = "https://soroban-testnet.stellar.org";
const server = new StellarSdk.rpc.Server(RPC_URL);

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!address) throw new Error("Address is required");

    // Issuer secret from our migration script
    const ISSUER_SECRET = "SCQU4HKG4Q2VQMV3QJMOQWU4PKXXLRA3BWDRYOUQZYMZ7CZU63CZAESF";
    const issuerKeys = StellarSdk.Keypair.fromSecret(ISSUER_SECRET);
    const asset = new StellarSdk.Asset("BNTY", issuerKeys.publicKey());

    console.log(`Issuing 10,000 BNTY to ${address}...`);

    const issuerAccount = await server.getAccount(issuerKeys.publicKey());
    
    // Create transaction to send Classic BNTY
    const tx = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: "10000", // Standard fee for classic ops
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: address,
          asset: asset,
          amount: "10000",
        })
      )
      .setTimeout(StellarSdk.TimeoutInfinite)
      .build();

    tx.sign(issuerKeys);
    
    // Submit via the same RPC server (it supports classic too)
    const result = await server.sendTransaction(tx);
    
    if (result.status === "ERROR") {
        throw new Error(`Classic payment failed: ${JSON.stringify(result.errorResult)}`);
    }

    return NextResponse.json({ success: true, hash: result.hash });
  } catch (error: any) {
    console.error("Faucet API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
