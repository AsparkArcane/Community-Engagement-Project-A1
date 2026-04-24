import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import NotificationCenter from '../components/NotificationCenter';

export default function HodDashboard() {
  const [rooms, setRooms] = useState([]);
  const [libraryAppliances, setLibraryAppliances] = useState([]);
  const [trendsData, setTrendsData] = useState([]);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isNewDeviceModalOpen, setIsNewDeviceModalOpen] = useState(false);
  const [isGlobalLibraryModalOpen, setIsGlobalLibraryModalOpen] = useState(false);
  const [isManageRoomModalOpen, setIsManageRoomModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [roomForm, setRoomForm] = useState({ name: '', code: '', type: 'lab' });
  const [selectedAppliances, setSelectedAppliances] = useState([]);

  const [currentApplianceSelection, setCurrentApplianceSelection] = useState('');
  const [currentApplianceQty, setCurrentApplianceQty] = useState(1);
  const [currentApplianceHrs, setCurrentApplianceHrs] = useState(8);

  const [newDeviceForm, setNewDeviceForm] = useState({ name: '', powerW: '', category: 'computing' });
  const [proposalForm, setProposalForm] = useState({ roomId: '', description: '', diffNext: '' });

  const [activeRoom, setActiveRoom] = useState(null);
  const [activeRoomHasTimetable, setActiveRoomHasTimetable] = useState(false);
  const [activeRoomAppliances, setActiveRoomAppliances] = useState([]);
  const [updatingApplianceId, setUpdatingApplianceId] = useState('');

  const [stats, setStats] = useState({ totalKWh: 0, loading: true });
  const [complaints, setComplaints] = useState([]);
  const [updatingComplaintId, setUpdatingComplaintId] = useState('');
  const [editingLibraryId, setEditingLibraryId] = useState('');
  const [libraryEditForm, setLibraryEditForm] = useState({ name: '', powerW: '', category: 'other' });
  const [libraryActionLoadingId, setLibraryActionLoadingId] = useState('');
  const [selectedTimetableRoomId, setSelectedTimetableRoomId] = useState('');
  const [timetableEntries, setTimetableEntries] = useState([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [savingTimetable, setSavingTimetable] = useState(false);
  const [timetableForm, setTimetableForm] = useState({
    dayOfWeek: '1',
    startTime: '09:00',
    endTime: '17:00',
    label: 'Lecture'
  });

  const getDepartmentId = () => {
    const user = JSON.parse(localStorage.getItem('vjti_user'));
    if (!user?.department) return null;
    return typeof user.department === 'string' ? user.department : user.department._id;
  };

  const isAnyModalOpen =
    isRoomModalOpen ||
    isNewDeviceModalOpen ||
    isGlobalLibraryModalOpen ||
    isManageRoomModalOpen ||
    isProposalModalOpen;

  useEffect(() => {
    fetchRooms();
    fetchLibrary();
    fetchDeptConsumption();
    fetchTrends();
    fetchComplaints();
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (!selectedTimetableRoomId) {
      setTimetableEntries([]);
      return;
    }
    fetchTimetableEntries(selectedTimetableRoomId);
  }, [selectedTimetableRoomId]);

  const fetchTrends = async () => {
    try {
      const departmentId = getDepartmentId();
      if (!departmentId) return;
      const res = await api.get(`/consumption/trends/department/${departmentId}`);
      setTrendsData(res.data);
    } catch {
      console.error('Failed to load department trends');
    }
  };

  const fetchDeptConsumption = async () => {
    try {
      const departmentId = getDepartmentId();
      const url = departmentId ? `/consumption/department/${departmentId}` : '/consumption/global';
      const res = await api.get(url);
      setStats({ totalKWh: res.data.totalKWh || 0, loading: false });
    } catch (err) {
      console.error(err);
      setStats(s => ({ ...s, loading: false }));
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch {
      toast.error('Failed to load rooms');
    }
  };

  const fetchLibrary = async () => {
    try {
      const res = await api.get('/appliances/library');
      setLibraryAppliances(res.data);
    } catch {
      toast.error('Failed to load appliance library');
    }
  };

  const fetchComplaints = async () => {
    try {
      const res = await api.get('/faults/public/feed');
      setComplaints(res.data || []);
    } catch {
      toast.error('Failed to load complaints');
    }
  };

  const dayName = (dayOfWeek) => {
    const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return labels[Number(dayOfWeek)] || 'Unknown';
  };

  const fetchTimetableEntries = async (roomId) => {
    setTimetableLoading(true);
    try {
      const res = await api.get(`/timetable/${roomId}`);
      setTimetableEntries(res.data || []);
    } catch {
      toast.error('Failed to load timetable');
    } finally {
      setTimetableLoading(false);
    }
  };

  const addTimetableEntry = async () => {
    if (!selectedTimetableRoomId) return toast.error('Select a room first');
    if (!timetableForm.startTime || !timetableForm.endTime) return toast.error('Start and end time required');
    setSavingTimetable(true);
    try {
      await api.post(`/timetable/${selectedTimetableRoomId}`, {
        dayOfWeek: Number(timetableForm.dayOfWeek),
        startTime: timetableForm.startTime,
        endTime: timetableForm.endTime,
        label: timetableForm.label || 'Lecture'
      });
      toast.success('Timetable entry added');
      fetchTimetableEntries(selectedTimetableRoomId);
    } catch {
      toast.error('Failed to add timetable entry');
    } finally {
      setSavingTimetable(false);
    }
  };

  const deleteTimetableEntry = async (entryId) => {
    if (!selectedTimetableRoomId) return;
    try {
      await api.delete(`/timetable/${selectedTimetableRoomId}/${entryId}`);
      toast.success('Timetable entry removed');
      fetchTimetableEntries(selectedTimetableRoomId);
    } catch {
      toast.error('Failed to delete timetable entry');
    }
  };

  const formatStatusLabel = (status) => {
    if (!status) return 'open';
    return status.replace('_', ' ');
  };

  const handleComplaintStatusChange = async (complaintId, nextStatus) => {
    const current = complaints.find(c => c._id === complaintId);
    if (!current || current.status === nextStatus) return;

    const previousStatus = current.status || 'open';
    setUpdatingComplaintId(complaintId);
    setComplaints(prev => prev.map(c => (
      c._id === complaintId ? { ...c, status: nextStatus } : c
    )));

    try {
      const res = await api.put(`/faults/${complaintId}`, { status: nextStatus });
      setComplaints(prev => prev.map(c => (
        c._id === complaintId ? { ...c, ...res.data } : c
      )));
      toast.success(`Complaint marked as ${formatStatusLabel(nextStatus)}`);
    } catch (err) {
      setComplaints(prev => prev.map(c => (
        c._id === complaintId ? { ...c, status: previousStatus } : c
      )));
      toast.error(err?.response?.data?.message || 'Failed to update complaint status');
    } finally {
      setUpdatingComplaintId('');
    }
  };

  const submitProposal = async () => {
    if (!proposalForm.roomId || !proposalForm.description) return toast.error('Select a room and provide justification');
    setLoading(true);
    try {
      await api.post('/proposals', {
        roomId: proposalForm.roomId,
        description: proposalForm.description,
        diff: { next: proposalForm.diffNext }
      });
      toast.success('Proposal submitted to Admins!');
      setIsProposalModalOpen(false);
      setProposalForm({ roomId: '', description: '', diffNext: '' });
    } catch {
      toast.error('Failed to submit proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleAddApplianceToRoom = () => {
    if (!currentApplianceSelection) return toast.error('Select an appliance first');
    if (currentApplianceQty < 1 || currentApplianceHrs < 1) return toast.error('Invalid quantity or usage hours');

    const libItem = libraryAppliances.find(appliance => appliance._id === currentApplianceSelection);
    if (selectedAppliances.some(appliance => appliance.applianceLibraryId === currentApplianceSelection)) {
      return toast.error('Appliance already added to this draft.');
    }

    setSelectedAppliances(current => [...current, {
      applianceLibraryId: currentApplianceSelection,
      name: libItem.name,
      quantity: Number(currentApplianceQty),
      usageHours: Number(currentApplianceHrs)
    }]);

    setCurrentApplianceSelection('');
    setCurrentApplianceQty(1);
    setCurrentApplianceHrs(8);
  };

  const submitRoomCreate = async () => {
    if (!roomForm.name) return toast.error('Room name is required');
    setLoading(true);
    try {
      const resRoom = await api.post('/rooms', {
        name: roomForm.name,
        code: roomForm.code,
        type: roomForm.type
      });
      const roomId = resRoom.data._id;

      for (const appliance of selectedAppliances) {
        await api.post(`/appliances/room/${roomId}`, {
          applianceLibraryId: appliance.applianceLibraryId,
          quantity: appliance.quantity,
          usageHours: appliance.usageHours
        });
      }

      toast.success('Room configured successfully!');
      setIsRoomModalOpen(false);
      setRoomForm({ name: '', code: '', type: 'lab' });
      setSelectedAppliances([]);
      fetchRooms();
      fetchDeptConsumption();
      fetchTrends();
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const submitNewDevice = async () => {
    if (!newDeviceForm.name || !newDeviceForm.powerW) return toast.error('Name and Power (W) are required');
    setLoading(true);
    try {
      const res = await api.post('/appliances/library', {
        name: newDeviceForm.name,
        powerW: Number(newDeviceForm.powerW),
        category: newDeviceForm.category
      });
      setLibraryAppliances(current => [...current, res.data]);
      toast.success('Device added to Central Library');
      setIsNewDeviceModalOpen(false);
      setNewDeviceForm({ name: '', powerW: '', category: 'computing' });
      setCurrentApplianceSelection(res.data._id);
    } catch {
      toast.error('Failed to add device');
    } finally {
      setLoading(false);
    }
  };

  const startEditingLibraryDevice = (device) => {
    setEditingLibraryId(device._id);
    setLibraryEditForm({
      name: device.name || '',
      powerW: device.powerW ?? '',
      category: device.category || 'other'
    });
  };

  const cancelEditingLibraryDevice = () => {
    setEditingLibraryId('');
    setLibraryEditForm({ name: '', powerW: '', category: 'other' });
  };

  const saveLibraryDeviceEdit = async (id) => {
    if (!libraryEditForm.name || libraryEditForm.powerW === '') {
      return toast.error('Name and Power (W) are required');
    }

    setLibraryActionLoadingId(id);
    try {
      await api.put(`/appliances/library/${id}`, {
        name: libraryEditForm.name,
        powerW: Number(libraryEditForm.powerW),
        category: libraryEditForm.category
      });
      toast.success('Device updated');
      cancelEditingLibraryDevice();
      fetchLibrary();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update device');
    } finally {
      setLibraryActionLoadingId('');
    }
  };

  const deleteLibraryDevice = async (id) => {
    if (!window.confirm('Delete this device from Global Library?')) return;

    setLibraryActionLoadingId(id);
    try {
      await api.delete(`/appliances/library/${id}`);
      toast.success('Device deleted');
      if (currentApplianceSelection === id) {
        setCurrentApplianceSelection('');
      }
      fetchLibrary();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete device');
    } finally {
      setLibraryActionLoadingId('');
    }
  };

  const handleOpenManageRoom = async (room) => {
    setActiveRoom({ ...room });
    setIsManageRoomModalOpen(true);
    setUpdatingApplianceId('');
    try {
      const [applianceRes, timetableRes] = await Promise.all([
        api.get(`/appliances/room/${room._id}`),
        api.get(`/timetable/${room._id}`)
      ]);
      setActiveRoomAppliances(applianceRes.data);
      setActiveRoomHasTimetable((timetableRes.data || []).length > 0);
    } catch {
      toast.error('Failed to load room appliances');
    }
  };

  const submitRoomUpdate = async () => {
    if (!activeRoom?.name) return toast.error('Name required');
    setLoading(true);
    try {
      await api.put(`/rooms/${activeRoom._id}`, {
        name: activeRoom.name,
        code: activeRoom.code,
        type: activeRoom.type
      });
      toast.success('Room updated successfully');
      fetchRooms();
      fetchDeptConsumption();
      fetchTrends();
      setIsManageRoomModalOpen(false);
    } catch {
      toast.error('Failed to update room');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete this completely?')) return;
    setLoading(true);
    try {
      await api.delete(`/rooms/${activeRoom._id}`);
      toast.success('Room deleted');
      setIsManageRoomModalOpen(false);
      setActiveRoom(null);
      fetchRooms();
      fetchDeptConsumption();
      fetchTrends();
    } catch {
      toast.error('Failed to delete room');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExistingAppliance = async (appId) => {
    try {
      await api.delete(`/appliances/room/${activeRoom._id}/${appId}`);
      setActiveRoomAppliances(current => current.filter(appliance => appliance._id !== appId));
      toast.success('Appliance removed');
      fetchDeptConsumption();
      fetchTrends();
    } catch {
      toast.error('Failed to remove appliance');
    }
  };

  const handleEditExistingAppliance = (appId, field, value) => {
    setActiveRoomAppliances(current => current.map(appliance => (
      appliance._id === appId ? { ...appliance, [field]: value } : appliance
    )));
  };

  const handleSaveExistingAppliance = async (appliance) => {
    setUpdatingApplianceId(appliance._id);
    try {
      const payload = { quantity: Number(appliance.quantity) };
      if (!activeRoomHasTimetable) {
        payload.usageHours = Number(appliance.usageHours);
      }
      await api.put(`/appliances/room/${activeRoom._id}/${appliance._id}`, payload);
      toast.success('Appliance settings updated');
      fetchDeptConsumption();
      fetchTrends();
    } catch {
      toast.error('Failed to update appliance');
    } finally {
      setUpdatingApplianceId('');
    }
  };

  const handleAddNewApplianceToExistingRoom = async () => {
    if (!currentApplianceSelection) return toast.error('Select an appliance first');
    if (!activeRoomHasTimetable && Number(currentApplianceHrs) < 1) return toast.error('Usage hours required when no timetable is configured');
    try {
      const payload = {
        applianceLibraryId: currentApplianceSelection,
        quantity: Number(currentApplianceQty)
      };
      if (!activeRoomHasTimetable) payload.usageHours = Number(currentApplianceHrs);
      const res = await api.post(`/appliances/room/${activeRoom._id}`, payload);
      const libItem = libraryAppliances.find(appliance => appliance._id === currentApplianceSelection);
      const newApp = { ...res.data, applianceLibraryId: libItem };

      setActiveRoomAppliances(current => [...current, newApp]);
      toast.success('Appliance mapped');
      fetchDeptConsumption();
      fetchTrends();

      setCurrentApplianceSelection('');
      setCurrentApplianceQty(1);
      setCurrentApplianceHrs(8);
    } catch {
      toast.error('Failed to attach appliance to room');
    }
  };

  const totalManagedHours = activeRoomAppliances.reduce((sum, appliance) => sum + (Number(appliance.usageHours) * Number(appliance.quantity)), 0);

  return (
    <div className="animate-fade-in-up">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-4">
        <h2>Department Controls</h2>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setIsGlobalLibraryModalOpen(true)}>Global Library</button>
          <button className="btn btn-secondary" onClick={() => setIsProposalModalOpen(true)}>New Proposal</button>
          <button className="btn btn-primary" onClick={() => setIsRoomModalOpen(true)}>+ Add New Room</button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3 className="text-secondary" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Dept Consumption</h3>
          <p className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
            {stats.loading ? '...' : `${(stats.totalKWh / 1000).toFixed(3)} MWh`}
          </p>
        </div>
        <div className="card">
          <h3 className="text-secondary" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Solar Potential Score</h3>
          <p className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>85/100</p>
          <p className="text-success text-sm">High feasibility</p>
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="mb-2">Rooms Overview ({rooms.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 0' }}>Room Name</th>
                <th>Code</th>
                <th>Type</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No rooms found. Add a new room above.</td>
                </tr>
              ) : rooms.map(room => (
                <tr key={room._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem 0' }}>{room.name}</td>
                  <td>{room.code || '-'}</td>
                  <td>{room.type}</td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => handleOpenManageRoom(room)}>Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex justify-between items-center mb-3" style={{ gap: '1rem' }}>
          <div>
            <h3 className="mb-1">Room Timetable Manager</h3>
            <p className="text-muted text-sm">Configure room usage timings. Consumption will use timetable hours automatically when present.</p>
          </div>
          <div style={{ minWidth: '280px' }}>
            <select className="input-field" value={selectedTimetableRoomId} onChange={e => setSelectedTimetableRoomId(e.target.value)}>
              <option value="">-- Select Room --</option>
              {rooms.map(room => (
                <option key={room._id} value={room._id}>{room.name} ({room.code || '-'})</option>
              ))}
            </select>
          </div>
        </div>

        {selectedTimetableRoomId ? (
          <>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label className="text-secondary text-sm mb-1 block">Day</label>
                <select className="input-field" value={timetableForm.dayOfWeek} onChange={e => setTimetableForm({ ...timetableForm, dayOfWeek: e.target.value })}>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>
              <div>
                <label className="text-secondary text-sm mb-1 block">Start</label>
                <input type="time" className="input-field" value={timetableForm.startTime} onChange={e => setTimetableForm({ ...timetableForm, startTime: e.target.value })} />
              </div>
              <div>
                <label className="text-secondary text-sm mb-1 block">End</label>
                <input type="time" className="input-field" value={timetableForm.endTime} onChange={e => setTimetableForm({ ...timetableForm, endTime: e.target.value })} />
              </div>
              <div>
                <label className="text-secondary text-sm mb-1 block">Label</label>
                <input type="text" className="input-field" value={timetableForm.label} onChange={e => setTimetableForm({ ...timetableForm, label: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button className="btn btn-primary w-full" disabled={savingTimetable} onClick={addTimetableEntry}>
                  {savingTimetable ? 'Saving...' : 'Add Slot'}
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem 0' }}>Day</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Label</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {timetableLoading ? (
                    <tr>
                      <td colSpan="5" className="text-muted text-sm" style={{ padding: '0.9rem 0' }}>Loading timetable...</td>
                    </tr>
                  ) : timetableEntries.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-muted text-sm" style={{ padding: '0.9rem 0' }}>No timetable entries for this room. Manual usage-hours fallback will be used.</td>
                    </tr>
                  ) : (
                    timetableEntries.map(entry => (
                      <tr key={entry._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 0' }}>{dayName(entry.dayOfWeek)}</td>
                        <td>{entry.startTime}</td>
                        <td>{entry.endTime}</td>
                        <td>{entry.label || 'Lecture'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.7rem' }} onClick={() => deleteTimetableEntry(entry._id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-muted text-sm">Select a room to manage its timetable slots.</p>
        )}
      </div>

      <div className="card mb-4">
        <h3 className="mb-3">Energy Trends (MWh)</h3>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorConsHod" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#101014', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#00f0ff' }}
              />
              <Area type="monotone" dataKey="consumption" stroke="#00f0ff" strokeWidth={3} fillOpacity={1} fill="url(#colorConsHod)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-4">
        <div className="card mb-4">
          <h3 className="mb-3">Complaint Status Manager</h3>
          {complaints.length === 0 ? (
            <p className="text-muted text-sm">No recent complaints found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '360px', overflowY: 'auto' }}>
              {complaints.map(complaint => (
                <div
                  key={complaint._id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: '0.75rem',
                    alignItems: 'center',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{complaint.roomId?.name || 'Unknown Location'}</p>
                    <p className="text-muted text-sm" style={{ marginBottom: '0.2rem' }}>
                      {complaint.roomId?.code ? `${complaint.roomId.code} - ` : ''}
                      {complaint.description || 'No description'}
                    </p>
                    <p className="text-muted text-sm">Current: {formatStatusLabel(complaint.status || 'open')}</p>
                  </div>
                  <select
                    className="input-field"
                    value={complaint.status || 'open'}
                    disabled={updatingComplaintId === complaint._id}
                    onChange={(e) => handleComplaintStatusChange(complaint._id, e.target.value)}
                    style={{ minWidth: '150px' }}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        <NotificationCenter />
      </div>

      {isAnyModalOpen && <div className="modal-scroll-guard" aria-hidden="true" />}

      {isManageRoomModalOpen && activeRoom && (
        <div className="fixed inset-0 z-50 modal-overlay" style={{ padding: '1rem' }}>
          <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto modal-panel" style={{ position: 'relative' }}>
            <button className="text-muted hover:text-primary" style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setIsManageRoomModalOpen(false)}>x</button>

            <div className="manage-room-layout">
              <div className="manage-room-column">
                <h2 className="mb-2">Manage: {activeRoom.name}</h2>
                <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
                  Update room details, review mapped appliances, and make quick schedule adjustments without leaving this dashboard.
                </p>

                <div className="manage-room-summary mb-4">
                  <div className="manage-room-summary-card">
                    <span className="text-muted text-sm">Mapped appliances</span>
                    <strong>{activeRoomAppliances.length}</strong>
                  </div>
                  <div className="manage-room-summary-card">
                    <span className="text-muted text-sm">Room code</span>
                    <strong>{activeRoom.code || 'Not set'}</strong>
                  </div>
                  <div className="manage-room-summary-card">
                    <span className="text-muted text-sm">Tracked usage hours</span>
                    <strong>{totalManagedHours}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-secondary text-sm mb-1 block">Room Name</label>
                    <input type="text" className="input-field" value={activeRoom.name} onChange={e => setActiveRoom({ ...activeRoom, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-secondary text-sm mb-1 block">Room Code</label>
                    <input type="text" className="input-field" value={activeRoom.code || ''} onChange={e => setActiveRoom({ ...activeRoom, code: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-secondary text-sm mb-1 block">Type</label>
                    <select className="input-field" value={activeRoom.type} onChange={e => setActiveRoom({ ...activeRoom, type: e.target.value })}>
                      <option value="lab">Lab</option>
                      <option value="classroom">Classroom</option>
                      <option value="office">Office</option>
                      <option value="common">Common Area</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-6" style={{ gap: '1rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }} onClick={handleDeleteRoom}>Delete Entire Room</button>
                  <button className="btn btn-primary" onClick={submitRoomUpdate} disabled={loading}>{loading ? 'Saving...' : 'Save Details'}</button>
                </div>
              </div>

              <div className="manage-room-column">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg">Assigned Appliances</h3>
                  <span className="text-muted text-sm">
                    {activeRoomHasTimetable ? 'Timetable mode: usage hours are calculated automatically.' : 'Fallback mode: edit quantity and daily hours directly.'}
                  </span>
                </div>

                <div className="p-3 rounded flex flex-col gap-3 mb-4" style={{ minHeight: '80px', maxHeight: '38vh', overflowY: 'auto', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)' }}>
                  {activeRoomAppliances.length === 0 ? (
                    <p className="text-muted text-sm text-center mt-3">No appliances found.</p>
                  ) : (
                    activeRoomAppliances.map(appliance => (
                      <div key={appliance._id} className="manage-appliance-card">
                        <div className="flex justify-between items-start" style={{ gap: '1rem' }}>
                          <div>
                            <span className="font-bold">{appliance.applianceLibraryId?.name || 'Unknown'}</span>
                            <p className="text-muted text-sm" style={{ marginTop: '0.25rem' }}>
                              {appliance.applianceLibraryId?.category || 'other'} appliance
                            </p>
                          </div>
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => handleRemoveExistingAppliance(appliance._id)}>Remove</button>
                        </div>

                        <div className="manage-appliance-grid manage-appliance-grid-stacked">
                          <div>
                            <label className="text-secondary text-sm mb-1 block">Quantity</label>
                            <input type="number" min="1" className="input-field" value={appliance.quantity} onChange={e => handleEditExistingAppliance(appliance._id, 'quantity', e.target.value)} />
                          </div>
                          {!activeRoomHasTimetable && (
                            <div>
                              <label className="text-secondary text-sm mb-1 block">Hours / day</label>
                              <input type="number" min="1" max="24" className="input-field" value={appliance.usageHours} onChange={e => handleEditExistingAppliance(appliance._id, 'usageHours', e.target.value)} />
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'stretch' }}>
                            <button className="btn btn-primary w-full" onClick={() => handleSaveExistingAppliance(appliance)} disabled={updatingApplianceId === appliance._id}>
                              {updatingApplianceId === appliance._id ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 style={{ marginBottom: 0 }}>Attach Another Appliance</h4>
                    <span className="text-muted text-sm">
                      {activeRoomHasTimetable ? 'Hours auto-derived from timetable.' : 'No timetable set. Enter hours manually.'}
                    </span>
                  </div>
                  <div className="manage-appliance-grid">
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="text-secondary text-sm mb-1 block">Select to Append</label>
                      <select className="input-field" value={currentApplianceSelection} onChange={e => setCurrentApplianceSelection(e.target.value)}>
                        <option value="">-- Choose Appliance --</option>
                        {libraryAppliances.map(appliance => (
                          <option key={appliance._id} value={appliance._id}>{appliance.name} ({appliance.powerW}W)</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-secondary text-sm mb-1 block">Qty</label>
                      <input type="number" min="1" className="input-field" value={currentApplianceQty} onChange={e => setCurrentApplianceQty(e.target.value)} />
                    </div>
                    {!activeRoomHasTimetable && (
                      <div>
                        <label className="text-secondary text-sm mb-1 block">Hrs</label>
                        <input type="number" min="1" max="24" className="input-field" value={currentApplianceHrs} onChange={e => setCurrentApplianceHrs(e.target.value)} />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'end' }}>
                      <button className="btn btn-secondary w-full" onClick={handleAddNewApplianceToExistingRoom}>Attach</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 modal-overlay" style={{ padding: '1rem' }}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-panel" style={{ position: 'relative' }}>
            <button className="text-muted hover:text-primary" style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setIsRoomModalOpen(false)}>x</button>
            <h2 className="mb-4">Configure New Room</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-secondary text-sm mb-1 block">Room Name</label>
                <input type="text" className="input-field" placeholder="e.g. Lab 301" value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-secondary text-sm mb-1 block">Room Code</label>
                <input type="text" className="input-field" placeholder="L-301" value={roomForm.code} onChange={e => setRoomForm({ ...roomForm, code: e.target.value })} />
              </div>
              <div>
                <label className="text-secondary text-sm mb-1 block">Type</label>
                <select className="input-field" value={roomForm.type} onChange={e => setRoomForm({ ...roomForm, type: e.target.value })}>
                  <option value="lab">Lab</option>
                  <option value="classroom">Classroom</option>
                  <option value="office">Office</option>
                  <option value="common">Common Area</option>
                </select>
              </div>
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: '1.5rem' }} />

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg">Appliance Configuration</h3>
                <span className="text-muted text-sm">Select device, then set quantity and usage hours.</span>
              </div>

              <div className="flex gap-2 items-end mb-4 bg-muted/10 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div style={{ flex: 2 }}>
                  <label className="text-secondary text-sm mb-1 block">Select from Library</label>
                  <select className="input-field" value={currentApplianceSelection} onChange={e => setCurrentApplianceSelection(e.target.value)}>
                    <option value="">-- Choose Appliance --</option>
                    {libraryAppliances.map(appliance => (
                      <option key={appliance._id} value={appliance._id}>{appliance.name} ({appliance.powerW}W)</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-secondary text-sm mb-1 block">Qty</label>
                  <input type="number" min="1" className="input-field" value={currentApplianceQty} onChange={e => setCurrentApplianceQty(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-secondary text-sm mb-1 block">Hrs/Day</label>
                  <input type="number" min="1" max="24" className="input-field" value={currentApplianceHrs} onChange={e => setCurrentApplianceHrs(e.target.value)} />
                </div>
                <div>
                  <button className="btn btn-secondary h-full" onClick={handleAddApplianceToRoom}>Add</button>
                </div>
              </div>

              <div className="p-3 rounded flex flex-col gap-2" style={{ minHeight: '100px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)' }}>
                {selectedAppliances.length === 0 ? (
                  <p className="text-muted text-sm text-center mt-6">No appliances added yet.</p>
                ) : (
                  selectedAppliances.map(appliance => (
                    <div key={appliance.applianceLibraryId} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                      <div>
                        <span className="font-bold">{appliance.name}</span>
                        <span className="text-secondary text-sm ml-2">x{appliance.quantity} ({appliance.usageHours} hrs/day)</span>
                      </div>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => setSelectedAppliances(current => current.filter(item => item.applianceLibraryId !== appliance.applianceLibraryId))}>Remove</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button className="btn btn-secondary" onClick={() => setIsRoomModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitRoomCreate} disabled={loading}>{loading ? 'Saving...' : 'Save Room & Appliances'}</button>
            </div>
          </div>
        </div>
      )}

      {isNewDeviceModalOpen && (
        <div className="fixed inset-0 z-[60] modal-overlay" style={{ padding: '1rem' }}>
          <div className="card w-full max-w-sm modal-panel">
            <h3 className="mb-4">New Global Appliance</h3>
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="text-secondary text-sm block mb-1">Standard Name</label>
                <input type="text" className="input-field" placeholder="e.g. 1.5 Ton AC" value={newDeviceForm.name} onChange={e => setNewDeviceForm({ ...newDeviceForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-secondary text-sm block mb-1">Power Rating (Watts)</label>
                <input type="number" className="input-field" placeholder="1500" value={newDeviceForm.powerW} onChange={e => setNewDeviceForm({ ...newDeviceForm, powerW: e.target.value })} />
              </div>
              <div>
                <label className="text-secondary text-sm block mb-1">Category</label>
                <select className="input-field" value={newDeviceForm.category} onChange={e => setNewDeviceForm({ ...newDeviceForm, category: e.target.value })}>
                  <option value="cooling">Cooling</option>
                  <option value="lighting">Lighting</option>
                  <option value="computing">Computing</option>
                  <option value="av">A/V & Display</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn btn-secondary text-sm" onClick={() => setIsNewDeviceModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitNewDevice} disabled={loading}>{loading ? 'Adding...' : 'Add Template'}</button>
            </div>
          </div>
        </div>
      )}

      {isGlobalLibraryModalOpen && (
        <div className="fixed inset-0 z-50 modal-overlay" style={{ padding: '1rem' }}>
          <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto modal-panel" style={{ position: 'relative' }}>
            <button
              className="text-muted hover:text-primary"
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              onClick={() => setIsGlobalLibraryModalOpen(false)}
            >
              x
            </button>

            <div className="flex justify-between items-center mb-4" style={{ gap: '1rem', paddingRight: '2rem' }}>
              <div>
                <h3 style={{ marginBottom: '0.25rem' }}>Global Device Library</h3>
                <p className="text-muted text-sm">Registered devices and their power ratings.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsNewDeviceModalOpen(true)}>+ Add New Device</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.8rem 0.5rem 0.8rem 0' }}>Device</th>
                    <th style={{ padding: '0.8rem 0.5rem' }}>Category</th>
                    <th style={{ padding: '0.8rem 0' }}>Power Rating (W)</th>
                    <th style={{ padding: '0.8rem 0', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {libraryAppliances.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-muted text-sm" style={{ padding: '1rem 0' }}>No devices registered yet.</td>
                    </tr>
                  ) : (
                    libraryAppliances.map(appliance => (
                      <tr key={appliance._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {editingLibraryId === appliance._id ? (
                          <>
                            <td style={{ padding: '0.75rem 0.5rem 0.75rem 0' }}>
                              <input
                                className="input-field"
                                style={{ minWidth: '180px' }}
                                value={libraryEditForm.name}
                                onChange={(e) => setLibraryEditForm({ ...libraryEditForm, name: e.target.value })}
                              />
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              <select
                                className="input-field"
                                value={libraryEditForm.category}
                                onChange={(e) => setLibraryEditForm({ ...libraryEditForm, category: e.target.value })}
                              >
                                <option value="cooling">Cooling</option>
                                <option value="lighting">Lighting</option>
                                <option value="computing">Computing</option>
                                <option value="av">A/V & Display</option>
                                <option value="other">Other</option>
                              </select>
                            </td>
                            <td style={{ padding: '0.75rem 0' }}>
                              <input
                                type="number"
                                className="input-field"
                                style={{ minWidth: '130px' }}
                                value={libraryEditForm.powerW}
                                onChange={(e) => setLibraryEditForm({ ...libraryEditForm, powerW: e.target.value })}
                              />
                            </td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: '0.25rem 0.75rem' }}
                                  disabled={libraryActionLoadingId === appliance._id}
                                  onClick={() => saveLibraryDeviceEdit(appliance._id)}
                                >
                                  {libraryActionLoadingId === appliance._id ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.25rem 0.75rem' }}
                                  disabled={libraryActionLoadingId === appliance._id}
                                  onClick={cancelEditingLibraryDevice}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '0.75rem 0.5rem 0.75rem 0', fontWeight: 600 }}>{appliance.name}</td>
                            <td className="text-muted text-sm" style={{ padding: '0.75rem 0.5rem' }}>{appliance.category || 'other'}</td>
                            <td style={{ padding: '0.75rem 0' }}>{appliance.powerW ?? '-'}</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.25rem 0.75rem' }}
                                  disabled={libraryActionLoadingId === appliance._id}
                                  onClick={() => startEditingLibraryDevice(appliance)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.25rem 0.75rem' }}
                                  disabled={libraryActionLoadingId === appliance._id}
                                  onClick={() => deleteLibraryDevice(appliance._id)}
                                >
                                  {libraryActionLoadingId === appliance._id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isProposalModalOpen && (
        <div className="fixed inset-0 z-50 modal-overlay" style={{ padding: '1rem' }}>
          <div className="card w-full max-w-lg modal-panel" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Submit Hardware Proposal</h3>
              <button onClick={() => setIsProposalModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>x</button>
            </div>
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="text-secondary text-sm block mb-1">Target Room</label>
                <select className="input-field" value={proposalForm.roomId} onChange={e => setProposalForm({ ...proposalForm, roomId: e.target.value })}>
                  <option value="">-- Choose Target Room --</option>
                  {rooms.map(room => (
                    <option key={room._id} value={room._id}>{room.name} ({room.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-secondary text-sm block mb-1">Justification</label>
                <textarea className="input-field" rows="3" placeholder="Explain why this upgrade is necessary..." value={proposalForm.description} onChange={e => setProposalForm({ ...proposalForm, description: e.target.value })} />
              </div>
              <div>
                <label className="text-secondary text-sm block mb-1">Requested Hardware (New Config)</label>
                <textarea className="input-field" rows="3" placeholder="+ 5x Daikin 1.5T Inverter AC (1200W)" value={proposalForm.diffNext} onChange={e => setProposalForm({ ...proposalForm, diffNext: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn btn-secondary text-sm" onClick={() => setIsProposalModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitProposal} disabled={loading}>{loading ? 'Submitting...' : 'Submit to Admin'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fixed { position: fixed; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .z-50 { z-index: 50; }
        .z-\\[60\\] { z-index: 60; }
        .max-h-\\[90vh\\] { max-height: 90vh; }
        .overflow-y-auto { overflow-y: auto; }
        .gap-3 { gap: 0.75rem; }
        .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .modal-overlay {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow-y: auto;
          background-color: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
        }
        .modal-panel {
          width: 100%;
          margin: 3rem auto;
        }
        .modal-scroll-guard {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }
        .manage-room-layout {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          gap: 1.5rem;
        }
        .manage-room-column {
          min-width: 0;
        }
        .manage-room-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
        }
        .manage-room-summary-card {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
        }
        .manage-appliance-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
        }
        .manage-appliance-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
        }
        .manage-appliance-grid-stacked {
          grid-template-columns: 1fr;
        }
        @media (max-width: 1024px) {
          .manage-room-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .modal-panel {
            margin: 1rem auto;
          }
          .manage-room-summary,
          .manage-appliance-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
