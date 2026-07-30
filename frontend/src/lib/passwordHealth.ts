import { estimateStrength } from './passwordStrength';

/** A login password to analyse (already decrypted, client-side only). */
export interface HealthEntry {
  id: number;
  title: string;
  password: string;
  updatedAt: string;
}

export type IssueKind = 'breached' | 'reused' | 'weak' | 'old';

export interface HealthItemResult {
  id: number;
  title: string;
  issues: IssueKind[];
  strengthLevel: number;
  breachCount: number;
}

export interface HealthReport {
  /** 0–100 overall security score. */
  score: number;
  /** Number of login passwords analysed. */
  total: number;
  /** How many items fall into each issue category. */
  counts: Record<IssueKind, number>;
  /** Items that have at least one issue, most severe first. */
  items: HealthItemResult[];
}

/** Passwords older than this (days) are flagged as stale. */
export const OLD_PASSWORD_DAYS = 180;

/** Severity order — drives penalty weight, sorting, and labels. */
export const ISSUE_ORDER: IssueKind[] = ['breached', 'reused', 'weak', 'old'];

const ISSUE_PENALTY: Record<IssueKind, number> = {
  breached: 1, // a breached password makes the item fully unhealthy
  reused: 0.5,
  weak: 0.4,
  old: 0.15,
};

export const ISSUE_LABEL: Record<IssueKind, string> = {
  breached: 'In a data breach',
  reused: 'Reused',
  weak: 'Weak',
  old: 'Old',
};

/**
 * Analyse decrypted login passwords into a health report. Pure function: all
 * inputs are already client-side, `breachByPassword` maps a password to how
 * many known breaches contain it (from HIBP).
 */
export function analyzePasswords(
  entries: HealthEntry[],
  breachByPassword: Map<string, number>,
): HealthReport {
  // Count occurrences to detect reuse.
  const occurrences = new Map<string, number>();
  for (const e of entries) {
    occurrences.set(e.password, (occurrences.get(e.password) ?? 0) + 1);
  }

  const now = Date.now();
  const counts: Record<IssueKind, number> = { breached: 0, reused: 0, weak: 0, old: 0 };
  let healthSum = 0;
  const results: HealthItemResult[] = [];

  for (const e of entries) {
    const strength = estimateStrength(e.password);
    const breachCount = breachByPassword.get(e.password) ?? 0;
    const ageDays = (now - new Date(e.updatedAt).getTime()) / 86_400_000;

    const issues: IssueKind[] = [];
    if (breachCount > 0) issues.push('breached');
    if ((occurrences.get(e.password) ?? 0) > 1) issues.push('reused');
    if (strength.level > 0 && strength.level <= 2) issues.push('weak');
    if (ageDays > OLD_PASSWORD_DAYS) issues.push('old');

    // Item health: subtract the worst-case combined penalties, clamp to [0,1].
    const penalty = issues.reduce((sum, kind) => sum + ISSUE_PENALTY[kind], 0);
    healthSum += Math.max(0, 1 - penalty);

    for (const kind of issues) counts[kind] += 1;

    if (issues.length > 0) {
      // Order this item's issues by severity for display.
      issues.sort((a, b) => ISSUE_ORDER.indexOf(a) - ISSUE_ORDER.indexOf(b));
      results.push({
        id: e.id,
        title: e.title,
        issues,
        strengthLevel: strength.level,
        breachCount,
      });
    }
  }

  const score = entries.length === 0 ? 100 : Math.round((healthSum / entries.length) * 100);

  // Most severe items first (by their top issue, then issue count).
  results.sort((a, b) => {
    const sev = ISSUE_ORDER.indexOf(a.issues[0]) - ISSUE_ORDER.indexOf(b.issues[0]);
    return sev !== 0 ? sev : b.issues.length - a.issues.length;
  });

  return { score, total: entries.length, counts, items: results };
}
