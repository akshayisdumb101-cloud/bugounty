import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Submission from "@/models/Submission";
import Bounty from "@/models/Bounty";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const bountyId = Number(body.bountyId);
    
    // Check if bounty is still open
    const bounty = await Bounty.findOne({ contractBountyId: bountyId });
    if (bounty && bounty.status === "Approved") {
      return NextResponse.json({ error: "Bounty is closed for submissions" }, { status: 400 });
    }
    
    // Calculate onChainIndex (count existing submissions for this bounty)
    const count = await Submission.countDocuments({ bountyId: bountyId });
    
    const submission = await Submission.create({
      ...body,
      bountyId: bountyId,
      onChainIndex: count
    });
    return NextResponse.json(submission, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const searchBountyId = searchParams.get("bountyId");
    const hunter = searchParams.get("hunter");

    let query: any = {};
    if (searchBountyId) query.bountyId = Number(searchBountyId);
    if (hunter) query.hunter = hunter;

    // Fetch in chronological order to determine correct indices
    const submissions = await Submission.find(query).sort({ timestamp: 1 });
    
    // Auto-heal missing indices on the fly
    const results = submissions.map((s, index) => {
      const obj = s.toObject();
      if (obj.onChainIndex === undefined || obj.onChainIndex === null) {
        obj.onChainIndex = index;
        // Background heal
        Submission.updateOne({ _id: s._id }, { $set: { onChainIndex: index } }).exec();
      }
      return obj;
    });

    return NextResponse.json(results.reverse()); // Return newest first for UI
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
