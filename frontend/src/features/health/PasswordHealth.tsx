import { useNavigate } from 'react-router-dom';
import { useVaultKey } from '../encryption/vaultKey';
import {
  ISSUE_LABEL,
  ISSUE_ORDER,
  type IssueKind,
} from '../../lib/passwordHealth';
import { LockIcon } from '../../components/icons';
import { useDialog } from '../../components/DialogProvider';
import { useToast } from '../../components/ToastProvider';
import type { HealthState } from './usePasswordHealth';

/** Colour for the score ring / issue chips by severity. */
const ISSUE_COLOR: Record<IssueKind, string> = {
  breached: '#ff6b6b',
  reused: '#f5a623',
  weak: '#e6d24a',
  old: '#8b93a3',
};

export default function PasswordHealth({ health }: { health: HealthState }) {
  const navigate = useNavigate();
  const { status, unlock, unlockWithRecovery } = useVaultKey();
  const { prompt } = useDialog();
  const toast = useToast();
  const { report, phase, error, retry } = health;

  if (status !== 'unlocked') {
    return (
      <section className="health">
        <div className="lock-banner">
          <span className="lock-banner-text">
            <LockIcon size={15} /> Unlock your vault to check password health
          </span>
          <span className="lock-banner-actions">
            <button
              type="button"
              className="link"
              disabled={status === 'unlocking'}
              onClick={async () => {
                const key = await prompt({
                  title: 'Recovery key',
                  message: 'Enter your recovery key to unlock the vault.',
                  placeholder: 'xxxxxxxx-xxxx-…',
                  confirmLabel: 'Unlock',
                });
                if (key) unlockWithRecovery(key).catch(() => toast.error('Recovery key did not work'));
              }}
            >
              Use recovery key
            </button>
            <button
              type="button"
              className="small"
              disabled={status === 'unlocking'}
              onClick={() =>
                unlock().catch(() => toast.error('Could not unlock (passkey/PRF unavailable)'))
              }
            >
              {status === 'unlocking' ? 'Unlocking…' : 'Unlock'}
            </button>
          </span>
        </div>
      </section>
    );
  }

  if (phase === 'analyzing' || phase === 'idle') {
    return (
      <section className="health">
        <p className="muted">Analysing your passwords…</p>
      </section>
    );
  }

  if (phase === 'error') {
    return (
      <section className="health">
        <p className="error">{error}</p>
        <button type="button" className="small" onClick={retry}>
          Try again
        </button>
      </section>
    );
  }

  if (!report || report.total === 0) {
    return (
      <section className="health">
        <p className="muted">No login passwords to check yet.</p>
      </section>
    );
  }

  const healthy = report.items.length === 0;

  return (
    <section className="health">
      <div className="health-tiles">
        <div className="health-tile">
          <span className="health-tile-count" style={{ color: '#4ccf7f' }}>
            {report.total - report.items.length}
          </span>
          <span className="health-tile-label">Healthy</span>
        </div>
        {ISSUE_ORDER.map((kind) => (
          <div className="health-tile" key={kind}>
            <span className="health-tile-count" style={{ color: ISSUE_COLOR[kind] }}>
              {report.counts[kind]}
            </span>
            <span className="health-tile-label">{ISSUE_LABEL[kind]}</span>
          </div>
        ))}
      </div>

      <p className="health-note">
        Only login passwords are analysed. Passkey-protected items are excluded — they
        open only with a fresh passkey.
      </p>

      {healthy ? (
        <p className="muted">All {report.total} login passwords look healthy. 🎉</p>
      ) : (
        <ul className="health-list">
          {report.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="health-item"
                onClick={() => navigate(`/vault?itemForm=${item.id}`)}
                title="Open to update"
              >
                <span className="health-item-title">{item.title}</span>
                <span className="health-item-issues">
                  {item.issues.map((kind) => (
                    <span
                      key={kind}
                      className="issue-chip"
                      style={{ color: ISSUE_COLOR[kind], borderColor: ISSUE_COLOR[kind] }}
                    >
                      {kind === 'breached' && item.breachCount > 0
                        ? `In ${item.breachCount.toLocaleString()} breaches`
                        : ISSUE_LABEL[kind]}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
