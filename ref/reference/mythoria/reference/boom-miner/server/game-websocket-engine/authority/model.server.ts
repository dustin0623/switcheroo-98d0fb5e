import mongoose, { type Model, Schema } from "mongoose";

export interface WalletLease {
  wallet: string;
  instanceId: string;
  fencingToken: number;
  expiresAt: Date;
  updatedAt: Date;
}

const WalletLeaseSchema = new Schema<WalletLease>(
  {
    wallet: { type: String, required: true, unique: true, index: true },
    instanceId: { type: String, required: true },
    fencingToken: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true, index: true },
  },
  { collection: "game_wallet_leases", timestamps: true },
);

export const WalletLeaseModel: Model<WalletLease> =
  mongoose.models.WalletLease ?? mongoose.model<WalletLease>("WalletLease", WalletLeaseSchema);
