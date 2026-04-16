import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications');
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to mark all read');
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'warning': return 'var(--status-warning)';
      case 'success': return 'var(--status-success)';
      case 'info': return 'var(--status-info)';
      case 'danger': return 'var(--status-danger)';
      default: return 'var(--brand-primary)';
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
         <h3>Notification Center</h3>
         <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={markAllRead}>Mark all read</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
        {notifications.length === 0 ? (
           <p className="text-muted text-sm text-center py-4">No notifications yet.</p>
        ) : (
          notifications.map(notif => (
            <div key={notif._id} style={{ padding: '1rem', background: notif.read ? 'transparent' : 'rgba(37,99,235,0.05)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${getTypeColor(notif.type)}`, border: notif.read ? '1px solid var(--border-color)' : '1px solid rgba(37,99,235,0.2)' }}>
              <div className="flex justify-between items-center mb-1">
                <h4 style={{ fontSize: '1rem', color: notif.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{notif.type.toUpperCase()}</h4>
                <span className="text-muted text-sm" style={{ fontSize: '0.75rem' }}>{new Date(notif.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-secondary text-sm">{notif.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
