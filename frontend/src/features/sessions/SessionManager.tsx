import { useEffect, useState } from 'react';
import {
  fetchSessions,
  revokeOtherSessions,
  revokeSession,
  type SessionInfo,
} from '../../api/client';
import { MonitorIcon, TrashIcon } from '../../components/icons';
import { useDialog } from '../../components/DialogProvider';
import { useToast } from '../../components/ToastProvider';

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'active just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `active ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `active ${hours}h ago`;
  return `active ${Math.floor(hours / 24)}d ago`;
}

export default function SessionManager() {
  const { confirm } = useDialog();
  const toast = useToast();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .catch(() => setError('Failed to load sessions.'));
  }, []);

  async function revoke(session: SessionInfo) {
    const ok = await confirm({
      title: 'Sign out this device?',
      message: 'It will need to log in again.',
      confirmLabel: 'Sign out',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      setSessions(await revokeSession(session.id));
      toast.success('Device signed out');
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setBusy(false);
    }
  }

  async function revokeOthers() {
    const ok = await confirm({
      title: 'Sign out other devices?',
      message: 'All sessions except this one will be signed out.',
      confirmLabel: 'Sign out all',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      setSessions(await revokeOtherSessions());
      toast.success('Other devices signed out');
    } catch {
      toast.error('Failed to sign out other devices');
    } finally {
      setBusy(false);
    }
  }

  const hasOthers = sessions.some((s) => !s.current);

  return (
    <section className="sessions">
      <nav className="crumbs" aria-label="Breadcrumb">
        <span className="crumb active">Sessions</span>
      </nav>

      <div className="section-controls">
        <p className="muted passkeys-hint">Devices currently signed in to your vault.</p>
        {hasOthers && (
          <button className="link danger" onClick={revokeOthers} disabled={busy}>
            Sign out others
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="muted">No active sessions.</p>
      ) : (
        <ul className="passkey-items">
          {sessions.map((session) => (
            <li key={session.id}>
              <div className="passkey-row">
                <span className="passkey-name">
                  <MonitorIcon size={17} />
                  {session.device}
                </span>
                <span className="passkey-date">
                  {session.ip ?? 'unknown IP'} · {timeAgo(session.last_active)}
                </span>
              </div>
              <span className="row-actions">
                {session.current ? (
                  <span className="session-current">This device</span>
                ) : (
                  <button
                    className="icon-btn danger"
                    title="Sign out"
                    aria-label="Sign out device"
                    onClick={() => revoke(session)}
                    disabled={busy}
                  >
                    <TrashIcon />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
