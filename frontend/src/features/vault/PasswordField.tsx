import { useEffect, useState } from 'react';
import { EyeIcon, EyeOffIcon, RefreshIcon } from '../../components/icons';
import { checkPwnedPassword } from '../../lib/hibp';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}';

/** Cryptographically-strong integer in [0, max). */
function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

/** Generate a strong password with at least one char from each class. */
function generatePassword(length = 20): string {
  const sets = [LOWER, UPPER, DIGITS, SYMBOLS];
  const all = sets.join('');
  const chars = sets.map((set) => set[randomInt(set.length)]);
  while (chars.length < length) {
    chars.push(all[randomInt(all.length)]);
  }
  // Fisher–Yates shuffle so the guaranteed chars aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

interface Strength {
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

/** Estimate strength from entropy (length × log2(character-pool size)). */
function estimateStrength(pw: string): Strength {
  if (!pw) return { level: 0, label: '', color: '#2a303c' };

  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 33;

  const entropy = pw.length * Math.log2(pool || 1);
  const level: Strength['level'] = entropy < 28 ? 1 : entropy < 44 ? 2 : entropy < 64 ? 3 : 4;

  return { level, ...LEVELS[level] };
}

type Breach =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'done'; count: number }
  | { status: 'error' };

export default function PasswordField({ label, value, onChange }: Props) {
  const [reveal, setReveal] = useState(false);
  const [breach, setBreach] = useState<Breach>({ status: 'idle' });
  const strength = estimateStrength(value);

  // A stale breach result must not linger once the password changes.
  useEffect(() => {
    setBreach({ status: 'idle' });
  }, [value]);

  async function check() {
    setBreach({ status: 'checking' });
    try {
      setBreach({ status: 'done', count: await checkPwnedPassword(value) });
    } catch {
      setBreach({ status: 'error' });
    }
  }

  return (
    <label className="pw-field">
      {label}
      <div className="pw-row">
        <input
          type={reveal ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="icon-btn pw-action"
          title={reveal ? 'Hide' : 'Show'}
          aria-label={reveal ? 'Hide password' : 'Show password'}
          onClick={() => setReveal((r) => !r)}
        >
          {reveal ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
        </button>
        <button
          type="button"
          className="icon-btn pw-action"
          title="Generate password"
          aria-label="Generate password"
          onClick={() => {
            onChange(generatePassword());
            setReveal(true);
          }}
        >
          <RefreshIcon size={17} />
        </button>
      </div>

      {value && (
        <div className="pw-meter">
          <div className="pw-bar">
            <div
              className="pw-bar-fill"
              style={{ width: `${strength.level * 25}%`, background: strength.color }}
            />
          </div>
          <span className="pw-strength" style={{ color: strength.color }}>
            {strength.label}
          </span>
        </div>
      )}

      {value && (
        <div className="pw-check">
          <button
            type="button"
            className="link"
            onClick={check}
            disabled={breach.status === 'checking'}
          >
            {breach.status === 'checking' ? 'Checking…' : 'Check password'}
          </button>

          {breach.status === 'done' &&
            (breach.count > 0 ? (
              <span className="pw-breached">
                ⚠ Found in {breach.count.toLocaleString()} breaches — choose another
              </span>
            ) : (
              <span className="pw-safe">✓ Not found in known breaches</span>
            ))}
          {breach.status === 'error' && (
            <span className="pw-check-muted">Couldn’t check right now</span>
          )}
        </div>
      )}
    </label>
  );
}
