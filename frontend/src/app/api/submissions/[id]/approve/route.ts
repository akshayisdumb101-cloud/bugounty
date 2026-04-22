import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Submission from "@/models/Submission";
import Bounty from "@/models/Bounty";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { posterAddress } = await req.json();

    const submission = await Submission.findById(id);
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const bounty = await Bounty.findOne({ contractBountyId: submission.bountyId });
    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    // Security check: Only the poster can approve
    if (bounty.poster !== posterAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update statuses
    submission.approved = true;
    await submission.save();

    bounty.status = "Approved";
    await bounty.save();

    return NextResponse.json({ message: "Bounty approved and payout triggered" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
