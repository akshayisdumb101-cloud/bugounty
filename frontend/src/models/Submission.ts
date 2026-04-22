import mongoose, { Schema, model, models } from "mongoose";

const SubmissionSchema = new Schema({
  bountyId: { type: Number, required: true },
  hunter: { type: String, required: true },
  ipfsLink: { type: String, required: true },
  onChainIndex: { type: Number, required: true },
  approved: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const Submission = models.Submission || model("Submission", SubmissionSchema);
export default Submission;
