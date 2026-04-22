import mongoose, { Schema, model, models } from "mongoose";

const BountySchema = new Schema({
  contractBountyId: { type: Number, required: true, unique: true },
  poster: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  reward: { type: String, required: true },
  deadline: { type: String, required: true },
  status: { type: String, enum: ["Active", "Urgent", "Approved", "Disputed"], default: "Active" },
  creationTxHash: { type: String, required: false },
  createdAt: { type: Date, default: Date.now }
});

const Bounty = models.Bounty || model("Bounty", BountySchema);
export default Bounty;
