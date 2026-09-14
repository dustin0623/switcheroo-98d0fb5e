import { ArrowDownToLine, ArrowUpFromLine, Clock, History, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatHash } from "@/lib/format";
import { notify } from "@/lib/notify";
import { usePlayerStore } from "@/features/stores/playerStore";
import { getTransactions } from "@/lib/api/client";
import type { PendingTxDto, SettledTxDto } from "@/lib/api/types";

const TX_LABELS: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  market_purchase: "Market purchase",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  failed: "bg-amber-500/10 text-amber-400",
  dead: "bg-rose-500/10 text-rose-400",
  settled: "bg-emerald-500/10 text-emerald-400",
};

function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
        STATUS_STYLES[status] ?? "bg-muted/40 text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

function fmtWhen(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TxRow({
  label,
  when,
  amount,
  status,
  statusLabel,
  note,
}: {
  label: string;
  when: number;
  amount: number;
  status: string;
  statusLabel: string;
  note?: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 py-2 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{label}</span>
          <StatusPill status={status} label={statusLabel} />
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtWhen(when)}</p>
        {note ? (
          <p className="mt-0.5 truncate text-[10px] text-rose-400/80" title={note}>
            {note}
          </p>
        ) : null}
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums">
        {amount > 0 ? "+" : amount < 0 ? "-" : ""}
        {formatHash(Math.abs(amount))}
      </span>
    </div>
  );
}

function HistoryPanel({ open }: { open: boolean }) {
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingTxDto[]>([]);
  const [history, setHistory] = useState<SettledTxDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getTransactions(25);
    if (result.ok) {
      setPending(result.pending ?? []);
      setHistory(result.history ?? []);
      setError(null);
    } else {
      setError(result.error ?? "Could not load transactions");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const empty = !loading && pending.length === 0 && history.length === 0;

  return (
    <div className="mt-3 max-h-72 overflow-y-auto pr-1">
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Loading transactions…
        </div>
      ) : error ? (
        <p className="py-6 text-xs text-muted-foreground">{error}</p>
      ) : empty ? (
        <p className="py-6 text-xs text-muted-foreground">
          No transactions yet. Deposits, withdrawals and marketplace purchases will show up here.
        </p>
      ) : (
        <>
          {pending.length > 0 ? (
            <>
              <p className="flex items-center gap-1.5 pb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <Clock className="size-3" /> Awaiting settlement
              </p>
              {pending.map((tx) => (
                <TxRow
                  key={tx.id}
                  label={TX_LABELS[tx.type] ?? tx.type}
                  when={tx.createdAt}
                  amount={tx.type === "deposit" ? tx.amount : -tx.amount}
                  status={tx.status}
                  statusLabel={
                    tx.refunded
                      ? "refunded"
                      : tx.status === "dead"
                        ? "failed"
                        : tx.status === "failed"
                          ? `retrying ${tx.retryCount}`
                          : "pending"
                  }
                  note={tx.error}
                />
              ))}
            </>
          ) : null}

          {history.length > 0 ? (
            <>
              <p className="pb-1 pt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Settled
              </p>
              {history.map((tx) => (
                <TxRow
                  key={tx.id}
                  label={TX_LABELS[tx.type] ?? tx.type}
                  when={tx.processedAt}
                  amount={tx.amount}
                  status="settled"
                  statusLabel="approved"
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Deposit / withdraw HASH between the on-chain wallet and the in-game balance. */
export function WalletModal({ children, wallet }: { children: ReactNode; wallet: number }) {
  const credit = usePlayerStore((state) => state.credit);
  const spend = usePlayerStore((state) => state.spend);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"deposit" | "withdraw" | "history">("deposit");
  const [amount, setAmount] = useState("");

  const qty = Number(amount);
  const valid = Number.isFinite(qty) && qty > 0 && (mode === "deposit" || qty <= wallet);

  const confirm = () => {
    if (!valid) return;
    if (mode === "deposit") {
      credit(qty);
      notify(`Deposited ${formatHash(qty)} HASH`, "success");
    } else {
      if (!spend(qty)) {
        notify("Not enough HASH", "danger");
        return;
      }
      notify(`Withdrew ${formatHash(qty)} HASH`, "success");
    }
    setAmount("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>HASH Wallet</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            In-game balance
          </p>
          <p className="font-mono text-xl font-bold tabular-nums">{formatHash(wallet)} HASH</p>
        </div>

        <Tabs
          value={mode}
          onValueChange={(value) => {
            setMode(value as "deposit" | "withdraw" | "history");
            setAmount("");
          }}
          className="mt-3"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deposit" className="gap-1.5">
              <ArrowDownToLine className="size-3.5" /> Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="gap-1.5">
              <ArrowUpFromLine className="size-3.5" /> Withdraw
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="size-3.5" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="mt-3 text-xs text-muted-foreground">
            Move HASH from your connected wallet into the rig to spend on upgrades and chests.
          </TabsContent>
          <TabsContent value="withdraw" className="mt-3 text-xs text-muted-foreground">
            Pull HASH out of the rig and back to your connected wallet.
          </TabsContent>
          <TabsContent value="history">
            <HistoryPanel open={open && mode === "history"} />
          </TabsContent>
        </Tabs>

        {mode === "history" ? null : (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <span className="text-xs font-semibold tracking-widest text-muted-foreground">
              HASH
            </span>
          </div>
          {mode === "withdraw" ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Available:</span>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setAmount(String(Math.floor(wallet * 100) / 100))}
              >
                {formatHash(wallet)} HASH
              </button>
            </div>
          ) : null}
        </div>
        )}

        {mode === "history" ? null : (
          <Button className="mt-4 w-full" disabled={!valid} onClick={confirm}>
            {mode === "deposit" ? "Deposit" : "Withdraw"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
