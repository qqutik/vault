import { useEffect, useState } from 'react';
import { fetchDashboard, logout, type Dashboard } from './api/client';
import { loginWithPasskey, registerPasskey } from './auth/passkey';
import ActivityLog from './features/activity/ActivityLog';
import FolderList from './features/folders/FolderList';
import VaultItems from './features/vault/VaultItems';
import { LogoutIcon } from './components/icons';
import './App.css';

type Tab = 'items' | 'folders';

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

  const [checking, setChecking] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [tab, setTab] = useState<Tab>('items');

  // On load, restore an existing session (httpOnly cookie survives reloads).
  useEffect(() => {
    fetchDashboard()
      .then(setDashboard)
      .catch(() => undefined)
      .finally(() => setChecking(false));
  }, []);

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
      <main className="card">
        <header className="dash-header">
          <div>
            <h1>🔐 Vault</h1>
            <p className="muted">Signed in as {dashboard.user.name}</p>
          </div>
          <button
            className="icon-btn logout"
            title="Log out"
            aria-label="Log out"
            onClick={handleLogout}
          >
            <LogoutIcon />
          </button>
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

        <div className="stats">
          <StatTab
            label="Folders"
            value={dashboard.stats.folders}
            active={tab === 'folders'}
            onClick={() => setTab('folders')}
          />
          <StatTab
            label="Items"
            value={dashboard.stats.vault_items}
            active={tab === 'items'}
            onClick={() => setTab('items')}
          />
          <Stat label="Passkeys" value={dashboard.stats.passkeys} />
          <Stat label="Favorites" value={dashboard.stats.favorites} />
        </div>

        {tab === 'items' ? (
          <VaultItems onChange={refresh} />
        ) : (
          <FolderList onChange={refresh} />
        )}

        <ActivityLog />
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function StatTab({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`stat stat-tab${active ? ' active' : ''}`} onClick={onClick}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </button>
  );
}
