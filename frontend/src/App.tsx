import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchDashboard, logout, type Dashboard } from './api/client';
import { loginWithPasskey, registerPasskey } from './auth/passkey';
import ActivityLog from './features/activity/ActivityLog';
import VaultBrowser from './features/vault/VaultBrowser';
import DevicesView from './features/devices/DevicesView';
import SettingsView from './features/settings/SettingsView';
import PasswordHealth from './features/health/PasswordHealth';
import { usePasswordHealth } from './features/health/usePasswordHealth';
import LockDial from './components/LockDial';
import { HistoryIcon, LogoutIcon, SettingsIcon } from './components/icons';
import { useVaultKey } from './features/encryption/vaultKey';
import './App.css';

type Tab = 'vault' | 'devices' | 'health' | 'activity' | 'settings';

type Mode = 'login' | 'register';

function errorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
    return anyErr.response?.data?.message ?? anyErr.message ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

export default function App() {
  const [mode, setMode] = useState<Mode>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { lock } = useVaultKey();
  const health = usePasswordHealth();
  const path = location.pathname;
  const tab: Tab = path.startsWith('/devices') || path.startsWith('/passkeys')
    ? 'devices'
    : path.startsWith('/health')
      ? 'health'
      : path.startsWith('/activity')
        ? 'activity'
        : path.startsWith('/settings')
          ? 'settings'
          : 'vault';
  const protectedActive =
    tab === 'vault' && new URLSearchParams(location.search).get('protected') === '1';
  const secretsActive = tab === 'vault' && !protectedActive;
  const healthScore = health.report ? Math.round(health.report.score / 10) : 0;

  const [checking, setChecking] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // On load, restore an existing session (httpOnly cookie survives reloads).
  useEffect(() => {
    fetchDashboard()
      .then(setDashboard)
      .catch(() => undefined)
      .finally(() => setChecking(false));
  }, []);

  // Default authenticated route (also redirect legacy paths).
  useEffect(() => {
    if (!dashboard) return;
    if (['/', '/items', '/folders'].includes(location.pathname)) {
      navigate('/vault', { replace: true });
    } else if (location.pathname.startsWith('/passkeys')) {
      navigate('/devices', { replace: true });
    }
  }, [dashboard, location.pathname, navigate]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await registerPasskey(name, email);
      setRecoveryCodes(result.recoveryCodes);
      setDashboard(await fetchDashboard());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await loginWithPasskey(email || undefined);
      setDashboard(await fetchDashboard());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    lock();
    await logout();
    setDashboard(null);
    setRecoveryCodes(null);
    setName('');
    setEmail('');
  }

  if (checking) {
    return (
      <main className="card">
        <h1>🔐 Vault</h1>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (dashboard) {
    const refresh = () => fetchDashboard().then(setDashboard);

    return (
      <main className="card card-app">
        <header className="dash-header">
          <div>
            <h1>🔐 Vault</h1>
            <p className="muted">Signed in as {dashboard.user.name}</p>
          </div>
          <div className="header-actions">
            <button
              className={`icon-btn${tab === 'activity' ? ' active' : ''}`}
              title="Recent activity"
              aria-label="Recent activity"
              onClick={() => navigate('/activity')}
            >
              <HistoryIcon />
            </button>
            <button
              className={`icon-btn${tab === 'settings' ? ' active' : ''}`}
              title="Settings"
              aria-label="Settings"
              onClick={() => navigate('/settings')}
            >
              <SettingsIcon />
            </button>
            <button
              className="icon-btn logout"
              title="Log out"
              aria-label="Log out"
              onClick={handleLogout}
            >
              <LogoutIcon />
            </button>
          </div>
        </header>

        {recoveryCodes && (
          <div className="recovery">
            <h2>Save your recovery codes</h2>
            <p className="muted">Shown once. Store them somewhere safe.</p>
            <ul>
              {recoveryCodes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="dials">
          <LockDial
            label="Secrets"
            value={dashboard.stats.vault_items}
            active={secretsActive}
            onClick={() => navigate('/vault')}
          />
          <LockDial
            label="Protected"
            value={dashboard.stats.protected}
            active={protectedActive}
            onClick={() => navigate('/vault?protected=1')}
          />
          <LockDial
            label="Devices"
            value={dashboard.stats.passkeys}
            active={tab === 'devices'}
            onClick={() => navigate('/devices')}
          />
          <LockDial
            label="Health"
            value={healthScore}
            active={tab === 'health'}
            onClick={() => navigate('/health')}
          />
        </div>

        <div className="card-body">
          {tab === 'devices' ? (
            <div className="scroll-view">
              <DevicesView onChange={refresh} />
            </div>
          ) : tab === 'health' ? (
            <div className="scroll-view">
              <PasswordHealth health={health} />
            </div>
          ) : tab === 'activity' ? (
            <div className="scroll-view">
              <ActivityLog userId={dashboard.user.id} />
            </div>
          ) : tab === 'settings' ? (
            <div className="scroll-view">
              <SettingsView />
            </div>
          ) : (
            <VaultBrowser onChange={refresh} />
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="card">
      <h1>🔐 Vault</h1>

      <div className="tabs">
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
          Register
        </button>
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
          Log in
        </button>
      </div>

      {mode === 'register' ? (
        <form onSubmit={handleRegister}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? 'Waiting for passkey…' : 'Create passkey'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin}>
          <label>
            Email <span className="muted">(optional)</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? 'Waiting for passkey…' : 'Log in with passkey'}
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}
