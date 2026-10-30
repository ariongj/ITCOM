import { useEffect, useState } from 'react';

/** Current time, re-read every `ms` (default 1 min) so "today" windows and "x min ago" stay fresh. */
export function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
