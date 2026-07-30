import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchHealthItems } from '../../api/client';
import { useVaultKey } from '../encryption/vaultKey';
import { isEncryptedBlob, type EncryptedBlob } from '../../lib/crypto';
import { checkPwnedPassword } from '../../lib/hibp';
import { analyzePasswords, type HealthEntry, type HealthReport } from '../../lib/passwordHealth';

export type HealthPhase = 'idle' | 'analyzing' | 'done' | 'error';

export interface HealthState {
  report: HealthReport | null;
  phase: HealthPhase;
  error: string | null;
  retry: () => void;
}

/** Run `fn` over `items` with limited concurrency (be gentle on HIBP). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Analyse the vault's login passwords once it's unlocked. Runs a single time
 * per unlock (guarded against StrictMode / re-render), so the score can be
 * shared by both the dashboard tab and the health view without recomputing.
 */
export function usePasswordHealth(): HealthState {
  const { status, decrypt } = useVaultKey();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [phase, setPhase] = useState<HealthPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  const analyze = useCallback(async () => {
    setPhase('analyzing');
    setError(null);
    try {
      const items = await fetchHealthItems();

      // Decrypt each login item and keep only those with a non-empty password.
      const entries: HealthEntry[] = [];
      for (const item of items) {
        const data = isEncryptedBlob(item.data as unknown)
          ? await decrypt(item.data as unknown as EncryptedBlob)
          : ((item.data ?? {}) as Record<string, string>);
        const password = data.password ?? '';
        if (password) {
          entries.push({ id: item.id, title: item.title, password, updatedAt: item.updated_at });
        }
      }

      // Breach-check each unique password once (HIBP, k-anonymity), throttled.
      const unique = [...new Set(entries.map((e) => e.password))];
      const counts = await mapLimit(unique, 4, (pw) => checkPwnedPassword(pw).catch(() => 0));
      const breachByPassword = new Map<string, number>();
      unique.forEach((pw, i) => breachByPassword.set(pw, counts[i]));

      setReport(analyzePasswords(entries, breachByPassword));
      setPhase('done');
    } catch {
      setError('Could not analyse your passwords.');
      setPhase('error');
    }
  }, [decrypt]);

  useEffect(() => {
    if (status !== 'unlocked' || ranRef.current) return;
    ranRef.current = true;
    analyze();
  }, [status, analyze]);

  const retry = useCallback(() => {
    ranRef.current = true;
    analyze();
  }, [analyze]);

  return { report, phase, error, retry };
}
