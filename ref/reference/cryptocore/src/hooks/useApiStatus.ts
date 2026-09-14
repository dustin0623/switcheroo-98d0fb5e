import { useEffect, useState } from "react";
import { healthCheck } from "@/lib/api/client";

export function useApiStatus() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { ok } = await healthCheck();
      if (!cancelled) {
        setOnline(ok);
        setLoading(false);
      }
    }

    void check();
    const interval = setInterval(() => void check(), 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { online, loading };
}
