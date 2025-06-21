import { Document, Types } from "mongoose";
export interface IService extends Document {
  title: string;
  dsc: string;
  img: string;

  user: {
    type: Types.ObjectId;
  };
}
