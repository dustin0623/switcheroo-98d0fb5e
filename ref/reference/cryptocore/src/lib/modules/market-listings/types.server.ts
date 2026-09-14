// src/lib/modules/market-listings/types.server.ts
import type { Document } from "mongoose";

export type ListingStatus = "active" | "sold" | "cancelled";

export interface IMarketListing extends Document {
  seller:    string;     // wallet address
  itemNumber: number;
  price:      number;
  status:     ListingStatus;
  soldTo?:    string;     // wallet address
  soldAt?:    number;     // Unix ms
  listedAt:   number;     // Unix ms
  createdAt:  Date;
  updatedAt:  Date;
}
