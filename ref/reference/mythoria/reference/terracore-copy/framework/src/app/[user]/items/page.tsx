"use client";

// Client component using TanStack Query, same as the parent app. This is the
// pattern for any interactive page in Next.js App Router — mark `"use client"`
// and use hooks freely. Server components can't call hooks.
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { InventoryResponse } from "@/mock/types";

async function fetchInventory(user: string): Promise<InventoryResponse> {
  const res = await fetch(`/api/mock/items/${user}`);
  if (!res.ok) throw new Error("Not found");
  return res.json();
}

export default function UserItemsPage() {
  // `useParams()` in Next replaces TanStack's `Route.useParams()`. It returns
  // an untyped record — cast to the shape the folder guarantees.
  const { user } = useParams<{ user: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["items", user],
    queryFn: () => fetchInventory(user),
    enabled: !!user,
  });

  return (
    <main className="container">
      <p className="muted">
        <Link href="/">← Home</Link>
      </p>
      <h1>{user} — inventory</h1>

      {isLoading && <p className="muted">Loading…</p>}
      {error && <p style={{ color: "tomato" }}>Not found.</p>}

      {data && (
        <div className="panel" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Item</th><th>Type</th><th>Rarity</th><th>DMG</th><th>DEF</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.id}>
                  <td className="mono muted">{it.item_number}</td>
                  <td>{it.name}</td>
                  <td>{it.type}</td>
                  <td>{it.rarity}</td>
                  <td className="mono">{it.attributes.damage}</td>
                  <td className="mono">{it.attributes.defense}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
