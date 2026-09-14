import Link from "next/link";
import { headers } from "next/headers";

// Server component that fetches through the HTTP API route — the same shape a
// client would use. In TanStack Start, the equivalent is a route `loader` that
// calls the server fn directly (no HTTP hop). Both are legit; picking `fetch`
// here mirrors how a Next client would consume `/api/mock/leaderboard`.
export const metadata = {
  title: "Leaderboard — Next.js port",
  description: "Server component that fetches the leaderboard API route.",
};

type Row = {
  username: string;
  level: number;
  experience: number;
  scrap: number;
  attacks: number;
  claims: number;
  stats: { damage: number };
};

async function getLeaderboard(): Promise<Row[]> {
  // In a real deploy you'd resolve the base URL from env; on the server we can
  // reconstruct it from the incoming request headers.
  const h = await headers();
  const host = h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}/api/mock/leaderboard?limit=50`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();
  return (
    <main className="container">
      <h1>Leaderboard</h1>
      <p className="muted">Fetched by a server component from <code>/api/mock/leaderboard</code>.</p>
      <div className="panel" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Citizen</th><th>Level</th><th>XP</th><th>Scrap</th><th>Attacks</th><th>Claims</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.username}>
                <td className="mono muted">{i + 1}</td>
                <td><Link href={`/${r.username}/items`}>{r.username}</Link></td>
                <td className="mono">{r.level}</td>
                <td className="mono">{r.experience.toLocaleString()}</td>
                <td className="mono">{r.scrap.toLocaleString()}</td>
                <td className="mono">{r.attacks}</td>
                <td className="mono">{r.claims}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
