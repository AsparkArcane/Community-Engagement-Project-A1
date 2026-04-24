import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [selectedRelatedRecord, setSelectedRelatedRecord] = useState(null);

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
      case 'danger':
      case 'alert':
      case 'escalation':
        return 'var(--status-danger)';
      default: return 'var(--brand-primary)';
    }
  };

  const openNotification = async (notification) => {
    setSelectedNotification(notification);
    setSelectedRelatedRecord(null);

    if (!notification.read) {
      try {
        await api.put(`/notifications/${notification._id}/read`);
        setNotifications(current => current.map(item => (
          item._id === notification._id ? { ...item, read: true } : item
        )));
      } catch {
        toast.error('Failed to update notification');
      }
    }

    if (notification.relatedModel === 'FaultLog' && notification.relatedId) {
      try {
        const res = await api.get(`/faults/${notification.relatedId}`);
        setSelectedRelatedRecord(res.data);
      } catch {
        setSelectedRelatedRecord({ error: true });
      }
      return;
    }

    if (notification.relatedModel === 'Proposal' && notification.relatedId) {
      try {
        const res = await api.get(`/proposals/${notification.relatedId}`);
        setSelectedRelatedRecord(res.data);
      } catch {
        setSelectedRelatedRecord({ error: true });
      }
    }
  };

  const getProposalReviewSummary = (proposal) => {
    const latestComment = proposal.comments?.length ? proposal.comments[proposal.comments.length - 1]?.text : '';
    const normalizedComment = latestComment?.trim();

    if (proposal.status === 'approved') {
      return {
        headline: 'This proposal was accepted.',
        detail: normalizedComment
          ? `The reviewer added this note: ${normalizedComment}`
          : 'No additional changes were requested.'
      };
    }

    if (proposal.status === 'rejected') {
      return {
        headline: normalizedComment ? 'Changes were suggested for this proposal.' : 'This proposal was rejected.',
        detail: normalizedComment
          ? `Suggested change: ${normalizedComment}`
          : 'No specific change instruction was attached to the rejection.'
      };
    }

    if (proposal.status === 'resubmitted') {
      return {
        headline: 'This proposal was updated and sent back for review.',
        detail: normalizedComment
          ? `Latest review note: ${normalizedComment}`
          : 'It is currently waiting for another admin decision.'
      };
    }

    return {
      headline: 'This proposal is still under review.',
      detail: normalizedComment
        ? `Latest note: ${normalizedComment}`
        : 'No decision has been recorded yet.'
    };
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
         <h3>Notification Center</h3>
         <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={markAllRead}>Mark all read</button>
      </div>

      <div className="notification-layout" style={{ gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
             <p className="text-muted text-sm text-center py-4">No notifications yet.</p>
          ) : (
            notifications.map(notif => (
              <button
                key={notif._id}
                type="button"
                onClick={() => openNotification(notif)}
                style={{
                  padding: '1rem',
                  width: '100%',
                  textAlign: 'left',
                  background: selectedNotification?._id === notif._id ? 'rgba(37,99,235,0.08)' : notif.read ? 'transparent' : 'rgba(37,99,235,0.05)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: `4px solid ${getTypeColor(notif.type)}`,
                  border: selectedNotification?._id === notif._id ? '1px solid rgba(37,99,235,0.3)' : notif.read ? '1px solid var(--border-color)' : '1px solid rgba(37,99,235,0.2)',
                  cursor: 'pointer'
                }}
              >
                <div className="flex justify-between items-center mb-1" style={{ gap: '0.75rem' }}>
                  <h4 style={{ fontSize: '1rem', color: notif.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{notif.type.toUpperCase()}</h4>
                  <span className="text-muted text-sm" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(notif.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-secondary text-sm" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {notif.message}
                </p>
              </button>
            ))
          )}
        </div>

        <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', minHeight: '240px' }}>
          {selectedNotification ? (
            <>
              <div className="flex justify-between items-center mb-3" style={{ gap: '1rem' }}>
                <h4 style={{ marginBottom: 0 }}>Notification Details</h4>
                <span style={{ fontSize: '0.75rem', color: getTypeColor(selectedNotification.type), fontWeight: 600 }}>
                  {selectedNotification.type.toUpperCase()}
                </span>
              </div>

              <p className="text-secondary text-sm" style={{ marginBottom: '0.75rem' }}>{selectedNotification.message}</p>
              <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
                Received on {new Date(selectedNotification.createdAt).toLocaleString()}
              </p>

              {selectedRelatedRecord?.error ? (
                <p className="text-muted text-sm">Linked details are no longer available.</p>
              ) : selectedRelatedRecord && selectedNotification.relatedModel === 'FaultLog' ? (
                <div style={{ padding: '0.875rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p className="text-sm" style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
                    Complaint: {selectedRelatedRecord.roomId?.name || 'Unknown Room'}
                  </p>
                  <p className="text-muted text-sm" style={{ marginBottom: '0.35rem' }}>
                    Status: {selectedRelatedRecord.status || 'open'}
                  </p>
                  <p className="text-muted text-sm" style={{ marginBottom: '0.35rem' }}>
                    Reported by: {selectedRelatedRecord.reportedBy?.name || 'Unknown'}
                  </p>
                  <p className="text-secondary text-sm">{selectedRelatedRecord.description}</p>
                </div>
              ) : selectedRelatedRecord && selectedNotification.relatedModel === 'Proposal' ? (
                <div style={{ padding: '0.875rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p className="text-sm" style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
                    Proposal for {selectedRelatedRecord.roomId?.name || 'Unknown Room'}
                  </p>
                  <p className="text-muted text-sm" style={{ marginBottom: '0.35rem' }}>
                    Submitted by: {selectedRelatedRecord.proposedBy?.name || 'Unknown'}
                  </p>
                  {selectedRelatedRecord.reviewedBy?.name && (
                    <p className="text-muted text-sm" style={{ marginBottom: '0.35rem' }}>
                      Reviewed by: {selectedRelatedRecord.reviewedBy.name}
                    </p>
                  )}
                  <p className="text-secondary text-sm" style={{ marginBottom: '0.5rem' }}>
                    {getProposalReviewSummary(selectedRelatedRecord).headline}
                  </p>
                  <p className="text-secondary text-sm" style={{ marginBottom: '0.5rem' }}>
                    {getProposalReviewSummary(selectedRelatedRecord).detail}
                  </p>
                  {selectedRelatedRecord.description && (
                    <p className="text-muted text-sm">
                      Original request: {selectedRelatedRecord.description}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted text-sm">Select a notification to inspect its full context.</p>
              )}
            </>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <p className="text-muted text-sm">Notification history is available here. Click any item to view its details.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .notification-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
        }
        @media (max-width: 900px) {
          .notification-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
