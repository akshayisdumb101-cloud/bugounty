import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Bounty from "@/models/Bounty";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const poster = searchParams.get("poster");
    const query = poster ? { poster } : {};
    const bounties = await Bounty.find(query).sort({ createdAt: -1 });
    return NextResponse.json(bounties);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const bounty = await Bounty.create(body);
    return NextResponse.json(bounty, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
