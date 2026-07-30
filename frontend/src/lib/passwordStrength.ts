/** Password-strength estimation shared by the item form and the health report. */

export interface Strength {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

const LEVELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Weak', color: '#ff6b6b' },
  2: { label: 'Fair', color: '#f5a623' },
  3: { label: 'Good', color: '#e6d24a' },
  4: { label: 'Strong', color: '#4ccf7f' },
};

/** Shannon-ish entropy estimate: length × log2(character-pool size), in bits. */
export function passwordEntropy(pw: string): number {
  if (!pw) return 0;

  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 33;

  return pw.length * Math.log2(pool || 1);
}

/** Map a password to a 0–4 strength level with a label and colour. */
export function estimateStrength(pw: string): Strength {
  if (!pw) return { level: 0, label: '', color: '#2a303c' };

  const entropy = passwordEntropy(pw);
  const level: Strength['level'] = entropy < 28 ? 1 : entropy < 44 ? 2 : entropy < 64 ? 3 : 4;

  return { level, ...LEVELS[level] };
}
