import { useEffect, useState } from 'react';

/** Milliseconds left until a moment, updated every second. Never negative. */
export function useCountdown(until: string | null): number {
  const target = until ? new Date(until).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return Math.max(0, target - now);
}
