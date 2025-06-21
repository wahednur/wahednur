import mongoose, { Schema, Types } from "mongoose";

export interface IService extends Document {
  title: string;
  dsc: string;
  img: string;
  live: string;
  git: string;
  case: string;
  user: {
    type: Types.ObjectId;
  };
  tags: string[];
  tech: string[];
}

const serviceSchema = new Schema<IService>(
  {
    title: { type: String, required: true },
    dsc: { type: String, required: true },
    img: { type: String },
    live: { type: String },
    git: { type: String },
    case: { type: String },
    user: { type: Schema.Types.ObjectId, ref: "user", required: true },
    tech: { type: [String], default: [] },
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Service ||
  mongoose.model<IService>("Service", serviceSchema);
