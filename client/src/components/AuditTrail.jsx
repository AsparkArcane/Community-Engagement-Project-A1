import React, { useState, useEffect } from 'react';
import api from '../api';

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/audit');
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="card"><div className="text-muted">Loading audit trail...</div></div>;

  return (
    <div className="card max-h-[500px] overflow-y-auto">
      <h3 className="mb-3">System Audit Trail</h3>
      {logs.length === 0 ? (
        <p className="text-muted text-sm">No recent system events logged.</p>
      ) : (
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '0.75rem 0' }}>Action</th>
              <th>User</th>
              <th>Target Model</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.75rem 0', fontFamily: 'monospace', color: 'var(--brand-primary)' }}>{log.action}</td>
                <td>{log.performedBy?.name || 'System'}</td>
                <td>{log.targetType}</td>
                <td className="text-muted">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
