import { useEffect, useState } from 'react';
import { fetchAuditLogs, type AuditLog, type Paginated } from '../../api/client';

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
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<AuditLog> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(p: number) {
    setError(null);
    try {
      setResult(await fetchAuditLogs(p));
    } catch {
      setError('Failed to load activity.');
    }
  }

  useEffect(() => {
    load(page);
  }, [page]);

  const logs = result?.data ?? [];
  const meta = result?.meta;

  return (
    <section className="activity">
      <h2>Recent activity</h2>

      {logs.length === 0 ? (
        <p className="muted">No activity yet.</p>
      ) : (
        <>
          <ul className="activity-items">
            {logs.map((log) => (
              <li key={log.id}>
                <span className="activity-icon">{ACTION_ICONS[log.action] ?? '•'}</span>
                <span className="activity-label">{ACTION_LABELS[log.action] ?? log.action}</span>
                <span className="activity-time">{timeAgo(log.created_at)}</span>
              </li>
            ))}
          </ul>

          {meta && meta.last_page > 1 && (
            <div className="pager">
              <button
                className="pager-arrow"
                aria-label="Previous page"
                disabled={meta.current_page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ←
              </button>
              <span className="pager-info">
                Page {meta.current_page} of {meta.last_page}
              </span>
              <button
                className="pager-arrow"
                aria-label="Next page"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
