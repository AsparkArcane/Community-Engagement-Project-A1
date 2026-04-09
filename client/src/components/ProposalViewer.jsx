import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';

export default function ProposalViewer() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const res = await api.get('/proposals');
      setProposals(res.data);
    } catch (err) {
      toast.error('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, status, isChangesRequest = false) => {
    let comment = '';
    if (status === 'rejected' || isChangesRequest) {
      comment = window.prompt(isChangesRequest ? 'Enter the changes you want the HOD to make:' : 'Enter reason for rejection (optional):');
      if (isChangesRequest && !comment) {
        return toast.error('You must provide instructions to request changes.');
      }
    }

    try {
      await api.put(`/proposals/${id}/review`, { status, comment });
      toast.success(status === 'approved' ? 'Proposal approved' : 'Proposal returned');
      fetchProposals();
    } catch (err) {
      toast.error('Failed to submit review');
    }
  };

  const user = JSON.parse(localStorage.getItem('vjti_user')) || { role: 'student' };

  if (loading) return <div className="text-muted">Loading proposals...</div>;

  const pendingProposals = proposals.filter(p => p.status === 'pending' || p.status === 'resubmitted');

  if (pendingProposals.length === 0) {
    return (
      <div className="card mb-4 flex flex-col items-center justify-center p-6 text-center" style={{ minHeight: '200px' }}>
        <p className="text-secondary mb-2">No Active Proposals</p>
        <p className="text-muted text-sm">All department proposals have been reviewed.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pendingProposals.map((p) => (
        <div key={p._id} className="card">
          <div className="flex items-center justify-between mb-3">
            <h3>Proposal for Room: {p.roomId?.name || 'Unknown'}</h3>
            <span style={{ 
              padding: '0.25rem 0.75rem', 
              background: p.status === 'resubmitted' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)', 
              color: p.status === 'resubmitted' ? '#3b82f6' : 'var(--status-warning)', 
              borderRadius: 'var(--radius-full)', 
              fontSize: '0.875rem' 
            }}>
              {p.status === 'resubmitted' ? 'Resubmitted' : 'Pending HOD'}
            </span>
          </div>
          
          <p className="text-muted mb-4">
            Proposed by: {p.proposedBy?.name || 'Unknown'} • 
            Submitted {new Date(p.submittedAt).toLocaleDateString()}
          </p>

          <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <p className="text-sm"><strong>HOD Justification: </strong> {p.description || 'No description provided'}</p>
          </div>

          {(p.diff?.prev || p.diff?.next) && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {p.diff.prev && (
                <div style={{ flex: '1 1 200px', border: '1px solid var(--status-danger)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)' }}>
                  <h4 className="text-danger mb-2" style={{ color: 'var(--status-danger)' }}>Old Configuration</h4>
                  <pre style={{ margin: 0, color: '#ef4444', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
                    {typeof p.diff.prev === 'string' ? p.diff.prev : JSON.stringify(p.diff.prev, null, 2)}
                  </pre>
                </div>
              )}
              {p.diff.next && (
                <div style={{ flex: '1 1 200px', border: '1px solid var(--status-success)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)' }}>
                  <h4 className="text-success mb-2" style={{ color: 'var(--status-success)' }}>New Configuration</h4>
                  <pre style={{ margin: 0, color: '#10b981', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
                     {typeof p.diff.next === 'string' ? p.diff.next : JSON.stringify(p.diff.next, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {user.role === 'admin' ? (
            <div className="flex gap-2">
              <button className="btn btn-primary" style={{ background: 'var(--status-success)', color: '#000' }} onClick={() => handleReview(p._id, 'approved')}>Approve</button>
              <button className="btn btn-secondary text-danger" onClick={() => handleReview(p._id, 'rejected')}>Reject</button>
              <button className="btn btn-secondary" onClick={() => handleReview(p._id, 'rejected', true)}>Request Changes</button>
            </div>
          ) : (
            <div className="text-muted text-sm border p-3 rounded" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
               Your proposal is currently pending administrative review. You will be notified once a decision is made.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
