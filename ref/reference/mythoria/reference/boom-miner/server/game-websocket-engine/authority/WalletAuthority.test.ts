import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOne: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock("@/lib/config/database", () => ({ connectDatabase: mocks.connect }));
vi.mock("./model.server", () => ({
  WalletLeaseModel: {
    findOneAndUpdate: mocks.findOneAndUpdate,
    findOne: mocks.findOne,
    updateOne: mocks.updateOne,
  },
}));

import { WalletAuthority } from "./WalletAuthority";

function leanResult<T>(value: T) {
  return { lean: vi.fn().mockResolvedValue(value) };
}

const grant = {
  wallet: "wallet-a",
  instanceId: "instance-a",
  fencingToken: 3,
  expiresAt: new Date(Date.now() + 10_000),
};

describe("WalletAuthority", () => {
  beforeEach(() => vi.clearAllMocks());

  it("treats unique-wallet contention as a rejected acquisition", async () => {
    mocks.findOneAndUpdate.mockReturnValue({
      lean: vi.fn().mockRejectedValue({ code: 11000 }),
    });
    await expect(new WalletAuthority().acquire("wallet-a")).resolves.toBeNull();
  });

  it("renews and validates only the matching fencing token", async () => {
    const authority = new WalletAuthority();
    Object.defineProperty(authority, "instanceId", { value: "instance-a" });
    mocks.findOneAndUpdate.mockReturnValue(leanResult(grant));
    mocks.findOne.mockReturnValue({
      select: vi.fn().mockReturnValue(leanResult({ _id: "lease" })),
    });

    await expect(authority.renew(grant)).resolves.toMatchObject({ fencingToken: 3 });
    await expect(authority.assertCurrent(grant)).resolves.toBe(true);
    expect(mocks.findOne).toHaveBeenCalledWith(expect.objectContaining({
      wallet: "wallet-a",
      instanceId: "instance-a",
      fencingToken: 3,
    }));
  });

  it("releases only its exact fenced lease", async () => {
    const authority = new WalletAuthority();
    Object.defineProperty(authority, "instanceId", { value: "instance-a" });
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });
    await authority.release("wallet-a", 3);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { wallet: "wallet-a", instanceId: "instance-a", fencingToken: 3 },
      expect.any(Object),
    );
  });
});
