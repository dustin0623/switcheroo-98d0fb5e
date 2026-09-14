import Link from "next/link";
import { getDataset } from "@/mock/dataset";

// This is a **React Server Component** — the default in the Next.js App Router.
// It runs on the server only, so we can call `getDataset()` (a Node-only helper)
// directly without a fetch round-trip. Compare to TanStack Start where the same
// pattern is expressed either via a `loader` on the route or a `createServerFn`
// call. No `"use client"` here => no client bundle for this file's code.
export const metadata = {
  title: "TerraCore — Home (Next.js port)",
  description: "Server-rendered home page — the App Router default.",
};

export default async function HomePage() {
  const ds = getDataset();
  const citizens = Object.keys(ds.players).slice(0, 10);
  const top = ds.leaderboard.slice(0, 10);

  return (
    <main className="container">
      <h1>TerraCore — Next.js Port</h1>
      <p className="muted">
        Side-by-side port of the TanStack Start app in the parent repo. Every
        API route under <code>/api/mock/*</code> mirrors the TanStack version
        1-to-1. Read <code>framework/README.md</code> for the concept map.
      </p>

      <section style={{ marginTop: 24 }}>
        <h2>Citizens</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {citizens.map((c) => (
            <Link key={c} href={`/${c}/items`} className="panel" style={{ padding: "6px 12px" }}>
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Top 10</h2>
        <div className="panel" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Citizen</th><th>Level</th><th>XP</th><th>Scrap</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r, i) => (
                <tr key={r.username}>
                  <td className="mono muted">{i + 1}</td>
                  <td><Link href={`/${r.username}/items`}>{r.username}</Link></td>
                  <td className="mono">{r.level}</td>
                  <td className="mono">{r.experience.toLocaleString()}</td>
                  <td className="mono">{r.scrap.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
