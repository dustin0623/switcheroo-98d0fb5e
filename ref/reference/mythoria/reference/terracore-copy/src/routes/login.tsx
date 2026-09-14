import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site-layout";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Mythoria" },
      { name: "description", content: "Log in with a Hive account to play Mythoria." },
      { property: "og:title", content: "Login — Mythoria" },
      { property: "og:description", content: "Log in with a Hive account to play Mythoria." },
    ],
  }),
  component: Login,
});

function Login() {
  return (
    <PageShell>
      <div className="container-tc py-16 flex items-center justify-center">
        <div className="bracket-frame w-full max-w-md bg-card/40">
          <h1 className="text-2xl font-bold tracking-wider text-foreground text-center">
            LOGIN
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            A Hive account is required to play Mythoria.
          </p>
          <form className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Hive Username
              </label>
              <input
                type="text"
                placeholder="username"
                className="mt-2 w-full bg-input/40 border border-border rounded-md px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="button"
              className="w-full border border-primary text-primary rounded-md px-4 py-2 text-sm font-semibold tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Continue →
            </button>
          </form>
        </div>
      </div>
    </PageShell>
  );
}