import { useEffect, useState } from 'react';
import { EyeIcon, EyeOffIcon, RefreshIcon } from '../../components/icons';
import { checkPwnedPassword } from '../../lib/hibp';
import { estimateStrength } from '../../lib/passwordStrength';

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
