import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { connectDatabase } from "@/lib/config/database";
import { WalletLeaseModel } from "./model.server";

const DEFAULT_LEASE_MS = 15_000;

export interface LeaseGrant {
  wallet: string;
  instanceId: string;
  fencingToken: number;
  expiresAt: Date;
}

export class WalletAuthority {
  readonly instanceId = `${process.env.VERCEL_REGION ?? "local"}:${hostname()}:${process.pid}:${randomUUID()}`;

  constructor(private readonly leaseMs = DEFAULT_LEASE_MS) {}

  async acquire(wallet: string): Promise<LeaseGrant | null> {
    await connectDatabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.leaseMs);
    try {
      const lease = await WalletLeaseModel.findOneAndUpdate(
      {
        wallet,
        $or: [
          { instanceId: this.instanceId },
          { expiresAt: { $lte: now } },
        ],
      },
      [
        {
          $set: {
            wallet,
            instanceId: this.instanceId,
            fencingToken: {
              $cond: [
                { $eq: ["$instanceId", this.instanceId] },
                { $ifNull: ["$fencingToken", 1] },
                { $add: [{ $ifNull: ["$fencingToken", 0] }, 1] },
              ],
            },
            expiresAt,
            updatedAt: now,
          },
        },
      ],
      { upsert: true, new: true, updatePipeline: true },
      ).lean<LeaseGrant | null>();
      return lease?.instanceId === this.instanceId ? lease : null;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
        return null;
      }
      throw error;
    }
  }

  async renew(grant: LeaseGrant): Promise<LeaseGrant | null> {
    await connectDatabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.leaseMs);
    const lease = await WalletLeaseModel.findOneAndUpdate(
      {
        wallet: grant.wallet,
        instanceId: grant.instanceId,
        fencingToken: grant.fencingToken,
        expiresAt: { $gt: now },
      },
      { $set: { expiresAt, updatedAt: now } },
      { new: true },
    ).lean<LeaseGrant | null>();
    return lease?.instanceId === this.instanceId ? lease : null;
  }

  async assertCurrent(grant: LeaseGrant): Promise<boolean> {
    await connectDatabase();
    const lease = await WalletLeaseModel.findOne({
      wallet: grant.wallet,
      instanceId: grant.instanceId,
      fencingToken: grant.fencingToken,
      expiresAt: { $gt: new Date() },
    }).select({ _id: 1 }).lean();
    return Boolean(lease);
  }

  async release(wallet: string, fencingToken: number): Promise<void> {
    await connectDatabase();
    await WalletLeaseModel.updateOne(
      { wallet, instanceId: this.instanceId, fencingToken },
      { $set: { expiresAt: new Date(0), updatedAt: new Date() } },
    );
  }
}
