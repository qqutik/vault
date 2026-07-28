import { useEffect, useState } from 'react';
import { fetchAuditLogs, type AuditLog } from '../../api/client';

const ACTION_LABELS: Record<string, string> = {
  'auth.registered': 'Registered',
  'login.success': 'Signed in',
  logout: 'Signed out',
  'item.viewed': 'Viewed an item',
  'item.created': 'Created an item',
  'item.updated': 'Updated an item',
  'item.deleted': 'Deleted an item',
  'folder.created': 'Created a folder',
  'folder.updated': 'Updated a folder',
  'folder.deleted': 'Deleted a folder',
};

const ACTION_ICONS: Record<string, string> = {
  'auth.registered': '🎉',
  'login.success': '🔓',
  logout: '👋',
  'item.viewed': '👁️',
  'item.created': '➕',
  'item.updated': '✏️',
  'item.deleted': '🗑️',
  'folder.created': '📁',
  'folder.updated': '✏️',
  'folder.deleted': '🗑️',
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setLogs(await fetchAuditLogs());
    } catch {
      setError('Failed to load activity.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="activity">
      <div className="activity-header">
        <h2>Recent activity</h2>
        <button className="small secondary" onClick={load}>
          Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="muted">No activity yet.</p>
      ) : (
        <ul className="activity-items">
          {logs.map((log) => (
            <li key={log.id}>
              <span className="activity-icon">{ACTION_ICONS[log.action] ?? '•'}</span>
              <span className="activity-label">{ACTION_LABELS[log.action] ?? log.action}</span>
              <span className="activity-time">{timeAgo(log.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
