import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../api';

export default function StudentDashboard() {
  const [rooms, setRooms] = useState([]);
  const [complaintForm, setComplaintForm] = useState({ roomId: '', description: '', severity: 'medium' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/rooms').then(res => setRooms(res.data)).catch(console.error);
  }, []);

  const submitComplaint = async () => {
    if (!complaintForm.roomId || !complaintForm.description) {
      return toast.error('Please fill in room and description fields');
    }
    setLoading(true);
    try {
      await api.post('/faults', complaintForm);
      toast.success('Complaint submitted successfully!');
      setComplaintForm({ roomId: '', description: '', severity: 'medium' });
    } catch (err) {
      toast.error('Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-4">
        <h2>Campus Energy Public Dashboard</h2>
      </div>

      <div className="card mb-4">
        <div className="text-center mb-4">
          <h3 className="text-secondary">Current Solar Savings</h3>
          <p className="text-gradient" style={{ fontSize: '3rem', fontWeight: 'bold' }}>12.5%</p>
          <p className="text-muted text-sm">Of total campus energy is running on renewables</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card text-center">
          <h3 className="text-secondary mb-2">Download Analytics Report</h3>
          <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>Access full detailed historical consumption data formatted in CSV</p>
          <button className="btn btn-secondary w-full">Download CSV</button>
        </div>
        <div className="card text-center">
          <h3 className="text-secondary mb-2">Simulation Sandbox</h3>
          <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>Model potential savings if more rooms added solar</p>
          <button className="btn btn-secondary w-full">Open Sandbox</button>
        </div>
      </div>

      <div className="card mb-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h3 className="mb-3">Report a Fault or Complaint</h3>
        <p className="text-muted text-sm mb-4">Notice a broken appliance or wasteful energy usage? Report it directly to the Head of Department.</p>
        
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <label className="text-secondary text-sm mb-1 block">Facility</label>
            <select className="input-field" value={complaintForm.roomId} onChange={e => setComplaintForm({...complaintForm, roomId: e.target.value})}>
              <option value="">-- Select location --</option>
              {rooms.map(r => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-secondary text-sm mb-1 block">Severity</label>
            <select className="input-field" value={complaintForm.severity} onChange={e => setComplaintForm({...complaintForm, severity: e.target.value})}>
              <option value="low">Low (e.g., inefficient minor appliance)</option>
              <option value="medium">Medium (e.g., faulty AC unit)</option>
              <option value="high">High (e.g., major electrical safety issue)</option>
            </select>
          </div>
          <div>
            <label className="text-secondary text-sm mb-1 block">Description</label>
            <textarea 
              className="input-field" 
              rows="3" 
              placeholder="Describe the issue..."
              value={complaintForm.description}
              onChange={e => setComplaintForm({...complaintForm, description: e.target.value})}
            />
          </div>
        </div>
        
        <button className="btn btn-primary w-full" onClick={submitComplaint} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Complaint to HOD'}
        </button>
      </div>
    </div>
  );
}
