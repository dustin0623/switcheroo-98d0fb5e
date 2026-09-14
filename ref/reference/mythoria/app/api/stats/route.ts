import mongoose from "mongoose";
import { connectDatabase } from "@/lib/config/database";
import { apiOk } from "@/lib/api/error-response";

export async function GET(): Promise<Response> {
  await connectDatabase();
  const db = mongoose.connection.db!;

  const [global_, daily] = await Promise.all([
    db.collection("stats").findOne(
      { date: "global" },
      { projection: { _id: 0 } }
    ),
    db
      .collection("stats")
      .find({ date: { $regex: /^\d{4}-\d{2}-\d{2}$/ } })
      .sort({ date: 1 })
      .toArray(),
  ]);

  return apiOk({ global: global_, daily });
}
