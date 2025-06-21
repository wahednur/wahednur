import { Document, Types } from "mongoose";

export interface IPortfolio extends Document {
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
