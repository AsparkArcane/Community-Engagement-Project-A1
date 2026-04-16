import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import NotificationCenter from '../components/NotificationCenter';

export default function HodDashboard() {
  const [rooms, setRooms] = useState([]);
  const [libraryAppliances, setLibraryAppliances] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  
  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isNewDeviceModalOpen, setIsNewDeviceModalOpen] = useState(false);
  const [isManageRoomModalOpen, setIsManageRoomModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forms
  const [roomForm, setRoomForm] = useState({ name: '', code: '', type: 'lab', area_sqm: '' });
  const [selectedAppliances, setSelectedAppliances] = useState([]); // { libraryId, quantity, usageHours }
  
  const [currentApplianceSelection, setCurrentApplianceSelection] = useState('');
  const [currentApplianceQty, setCurrentApplianceQty] = useState(1);
  const [currentApplianceHrs, setCurrentApplianceHrs] = useState(8);

  const [newDeviceForm, setNewDeviceForm] = useState({ name: '', powerW: '', category: 'computing' });
  const [proposalForm, setProposalForm] = useState({ roomId: '', description: '', diffNext: '' });

  // Manage Active Room State
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeRoomAppliances, setActiveRoomAppliances] = useState([]);

  // Stats
  const [stats, setStats] = useState({ totalKWh: 0, loading: true });

  useEffect(() => {
    fetchRooms();
    fetchLibrary();
    fetchDeptConsumption();
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('vjti_user'));
      if (!user?.department) return;
      const res = await api.get(`/consumption/trends/department/${user.department}`);
      setTrendsData(res.data);
    } catch (err) {
      console.error('Failed to load department trends');
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
    } catch (err) {
      toast.error('Failed to submit proposal');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeptConsumption = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('vjti_user'));
      const url = user?.department ? `/consumption/department/${user.department}` : `/consumption/global`;
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
    } catch (err) {
      toast.error('Failed to load rooms');
    }
  };

  const fetchLibrary = async () => {
    try {
      const res = await api.get('/appliances/library');
      setLibraryAppliances(res.data);
    } catch (err) {
      toast.error('Failed to load appliance library');
    }
  };

  // --- ADD NEW ROOM LOGIC ---

  const handleAddApplianceToRoom = () => {
    if (!currentApplianceSelection) return toast.error('Select an appliance first');
    if (currentApplianceQty < 1 || currentApplianceHrs < 1) return toast.error('Invalid quantity/hours');
    
    const libItem = libraryAppliances.find(a => a._id === currentApplianceSelection);
    if (selectedAppliances.some(a => a.applianceLibraryId === currentApplianceSelection)) {
      return toast.error('Appliance already added to this draft.');
    }

    setSelectedAppliances([...selectedAppliances, {
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
        type: roomForm.type,
        area_sqm: Number(roomForm.area_sqm) || 0
      });
      const roomId = resRoom.data._id;
      for (const app of selectedAppliances) {
        await api.post(`/appliances/room/${roomId}`, {
          applianceLibraryId: app.applianceLibraryId,
          quantity: app.quantity,
          usageHours: app.usageHours
        });
      }
      toast.success('Room configured successfully!');
      setIsRoomModalOpen(false);
      setRoomForm({ name: '', code: '', type: 'lab', area_sqm: '' });
      setSelectedAppliances([]);
      fetchRooms();
      fetchDeptConsumption();
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // --- GLOBAL LIBRARY LOGIC ---

  const submitNewDevice = async () => {
    if (!newDeviceForm.name || !newDeviceForm.powerW) return toast.error('Name and Power (W) are required');
    setLoading(true);
    try {
      const res = await api.post('/appliances/library', {
        name: newDeviceForm.name,
        powerW: Number(newDeviceForm.powerW),
        category: newDeviceForm.category
      });
      setLibraryAppliances([...libraryAppliances, res.data]);
      toast.success('Device added to Central Library');
      setIsNewDeviceModalOpen(false);
      setNewDeviceForm({ name: '', powerW: '', category: 'computing' });
      setCurrentApplianceSelection(res.data._id);
    } catch (err) {
      toast.error('Failed to add device');
    } finally {
      setLoading(false);
    }
  };

  // --- MANAGE ROOM LOGIC ---

  const handleOpenManageRoom = async (room) => {
    setActiveRoom({ ...room });
    setIsManageRoomModalOpen(true);
    try {
      const res = await api.get(`/appliances/room/${room._id}`);
      setActiveRoomAppliances(res.data);
    } catch (err) {
      toast.error('Failed to load room appliances');
    }
  };

  const submitRoomUpdate = async () => {
    if (!activeRoom.name) return toast.error('Name required');
    setLoading(true);
    try {
      await api.put(`/rooms/${activeRoom._id}`, {
        name: activeRoom.name,
        code: activeRoom.code,
        type: activeRoom.type,
        area_sqm: activeRoom.area_sqm
      });
      toast.success('Room updated successfully');
      fetchRooms();
      setIsManageRoomModalOpen(false);
    } catch (err) {
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
    } catch (err) {
      toast.error('Failed to delete room');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExistingAppliance = async (appId) => {
    try {
      await api.delete(`/appliances/room/${activeRoom._id}/${appId}`);
      setActiveRoomAppliances(activeRoomAppliances.filter(a => a._id !== appId));
      toast.success('Appliance removed');
      fetchDeptConsumption();
    } catch (err) {
      toast.error('Failed to remove appliance');
    }
  };

  const handleAddNewApplianceToExistingRoom = async () => {
    if (!currentApplianceSelection) return toast.error('Select an appliance first');
    try {
      const res = await api.post(`/appliances/room/${activeRoom._id}`, {
        applianceLibraryId: currentApplianceSelection,
        quantity: Number(currentApplianceQty),
        usageHours: Number(currentApplianceHrs)
      });
      const libItem = libraryAppliances.find(a => a._id === currentApplianceSelection);
      const newApp = { ...res.data, applianceLibraryId: libItem };
      
      setActiveRoomAppliances([...activeRoomAppliances, newApp]);
      toast.success('Appliance mapped');
      fetchDeptConsumption();
      
      setCurrentApplianceSelection('');
      setCurrentApplianceQty(1);
      setCurrentApplianceHrs(8);
    } catch (err) {
      toast.error('Failed to attach appliance to room');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <Toaster position="top-right" />
      
      <div className="flex items-center justify-between mb-4">
        <h2>Department Controls</h2>
        <div className="flex gap-2">
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
                <th>Area (sqm)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No rooms found. Add a new room above.</td>
                </tr>
              ) : rooms.map(room => (
                <tr key={room._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem 0' }}>{room.name}</td>
                  <td>{room.code || '-'}</td>
                  <td>{room.type}</td>
                  <td>{room.area_sqm || '-'}</td>
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
         <h3 className="mb-3">Energy Trends (MWh)</h3>
         <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConsHod" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
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
         <NotificationCenter />
      </div>

      {/* MODAL: MANAGE EXISTING ROOM */}
      {isManageRoomModalOpen && activeRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ padding: '1rem' }}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ position: 'relative' }}>
            <button className="text-muted hover:text-primary" style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setIsManageRoomModalOpen(false)}>✕</button>
            <h2 className="mb-4">Manage: {activeRoom.name}</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-secondary text-sm mb-1 block">Room Name</label>
                <input type="text" className="input-field" value={activeRoom.name} onChange={e => setActiveRoom({...activeRoom, name: e.target.value})} />
              </div>
              <div>
                <label className="text-secondary text-sm mb-1 block">Room Code</label>
                <input type="text" className="input-field" value={activeRoom.code || ''} onChange={e => setActiveRoom({...activeRoom, code: e.target.value})} />
              </div>
              <div>
                <label className="text-secondary text-sm mb-1 block">Type</label>
                <select className="input-field" value={activeRoom.type} onChange={e => setActiveRoom({...activeRoom, type: e.target.value})}>
                  <option value="lab">Lab</option>
                  <option value="classroom">Classroom</option>
                  <option value="office">Office</option>
                  <option value="common">Common Area</option>
                </select>
              </div>
              <div>
                <label className="text-secondary text-sm mb-1 block">Area (sqm)</label>
                <input type="number" className="input-field" value={activeRoom.area_sqm || ''} onChange={e => setActiveRoom({...activeRoom, area_sqm: e.target.value})} />
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <button style={{ color: 'var(--status-danger)', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: '500' }} onClick={handleDeleteRoom}>Delete Entire Room</button>
              <button className="btn btn-primary" onClick={submitRoomUpdate} disabled={loading}>{loading ? 'Saving...' : 'Save Details'}</button>
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: '1.5rem' }} />

            {/* Existing Appliances */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg">Assigned Appliances</h3>
              </div>
              
              <div className="p-3 rounded flex flex-col gap-2 mb-4" style={{ minHeight: '80px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)' }}>
                {activeRoomAppliances.length === 0 ? (
                  <p className="text-muted text-sm text-center mt-3">No appliances found.</p>
                ) : (
                  activeRoomAppliances.map((app) => (
                    <div key={app._id} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                      <div>
                        <span className="font-bold">{app.applianceLibraryId?.name || 'Unknown'}</span>
                        <span className="text-secondary text-sm ml-2">x{app.quantity} ({app.usageHours} hrs/day)</span>
                      </div>
                      <button className="text-danger text-sm hover:underline" style={{ color: 'var(--status-danger)' }} onClick={() => handleRemoveExistingAppliance(app._id)}>Remove</button>
                    </div>
                  ))
                )}
              </div>

              {/* Add MORE to existing room */}
              <div className="flex gap-2 items-end bg-muted/10 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div style={{ flex: 2 }}>
                  <label className="text-secondary text-sm mb-1 block">Select to Append</label>
                  <select className="input-field" value={currentApplianceSelection} onChange={e => setCurrentApplianceSelection(e.target.value)}>
                    <option value="">-- Choose Appliance --</option>
                    {libraryAppliances.map(app => (
                      <option key={app._id} value={app._id}>{app.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-secondary text-sm mb-1 block">Qty</label>
                  <input type="number" min="1" className="input-field" value={currentApplianceQty} onChange={e => setCurrentApplianceQty(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-secondary text-sm mb-1 block">Hrs</label>
                  <input type="number" min="1" max="24" className="input-field" value={currentApplianceHrs} onChange={e => setCurrentApplianceHrs(e.target.value)} />
                </div>
                <div>
                   <button className="btn btn-secondary h-full" onClick={handleAddNewApplianceToExistingRoom}>Attach</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* MODAL: ADD NEW ROOM */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ padding: '1rem' }}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ position: 'relative' }}>
            <button className="text-muted hover:text-primary" style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setIsRoomModalOpen(false)}>✕</button>
            <h2 className="mb-4">Configure New Room</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-secondary text-sm mb-1 block">Room Name</label>
                <input type="text" className="input-field" placeholder="e.g. Lab 301" value={roomForm.name} onChange={e => setRoomForm({...roomForm, name: e.target.value})} />
              </div>
              <div>
                <label className="text-secondary text-sm mb-1 block">Room Code</label>
                <input type="text" className="input-field" placeholder="L-301" value={roomForm.code} onChange={e => setRoomForm({...roomForm, code: e.target.value})} />
              </div>
              <div>
                <label className="text-secondary text-sm mb-1 block">Type</label>
                <select className="input-field" value={roomForm.type} onChange={e => setRoomForm({...roomForm, type: e.target.value})}>
                  <option value="lab">Lab</option>
                  <option value="classroom">Classroom</option>
                  <option value="office">Office</option>
                  <option value="common">Common Area</option>
                </select>
              </div>
              <div>
                <label className="text-secondary text-sm mb-1 block">Area (sqm)</label>
                <input type="number" className="input-field" placeholder="60" value={roomForm.area_sqm} onChange={e => setRoomForm({...roomForm, area_sqm: e.target.value})} />
              </div>
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: '1.5rem' }} />

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg">Appliance Configuration</h3>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => setIsNewDeviceModalOpen(true)}>+ Add Global Device</button>
              </div>
              
              <div className="flex gap-2 items-end mb-4 bg-muted/10 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div style={{ flex: 2 }}>
                  <label className="text-secondary text-sm mb-1 block">Select from Library</label>
                  <select className="input-field" value={currentApplianceSelection} onChange={e => setCurrentApplianceSelection(e.target.value)}>
                    <option value="">-- Choose Appliance --</option>
                    {libraryAppliances.map(app => (
                      <option key={app._id} value={app._id}>{app.name} ({app.powerW}W)</option>
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
                  selectedAppliances.map((app) => (
                    <div key={app.applianceLibraryId} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                      <div>
                        <span className="font-bold">{app.name}</span>
                        <span className="text-secondary text-sm ml-2">x{app.quantity} ({app.usageHours} hrs/day)</span>
                      </div>
                      <button className="text-danger text-sm hover:underline" style={{ color: 'var(--status-danger)' }} onClick={() => {
                        setSelectedAppliances(selectedAppliances.filter(a => a.applianceLibraryId !== app.applianceLibraryId));
                      }}>Remove</button>
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

      {/* SECONDARY MODAL: ADD TO GLOBAL LIBRARY */}
      {isNewDeviceModalOpen && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ padding: '1rem' }}>
         <div className="card w-full max-w-sm">
           <h3 className="mb-4">New Global Appliance</h3>
           <div className="flex flex-col gap-3 mb-4">
             <div>
               <label className="text-secondary text-sm block mb-1">Standard Name</label>
               <input type="text" className="input-field" placeholder="e.g. 1.5 Ton AC" value={newDeviceForm.name} onChange={e => setNewDeviceForm({...newDeviceForm, name: e.target.value})} />
             </div>
             <div>
               <label className="text-secondary text-sm block mb-1">Power Rating (Watts)</label>
               <input type="number" className="input-field" placeholder="1500" value={newDeviceForm.powerW} onChange={e => setNewDeviceForm({...newDeviceForm, powerW: e.target.value})} />
             </div>
             <div>
               <label className="text-secondary text-sm block mb-1">Category</label>
               <select className="input-field" value={newDeviceForm.category} onChange={e => setNewDeviceForm({...newDeviceForm, category: e.target.value})}>
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

      {/* MODAL: SUBMIT NEW PROPOSAL */}
      {isProposalModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ padding: '1rem' }}>
         <div className="card w-full max-w-lg">
           <h3 className="mb-4">Submit Hardware Proposal</h3>
           <div className="flex flex-col gap-3 mb-4">
             <div>
               <label className="text-secondary text-sm block mb-1">Target Room</label>
               <select className="input-field" value={proposalForm.roomId} onChange={e => setProposalForm({...proposalForm, roomId: e.target.value})}>
                 <option value="">-- Choose Target Room --</option>
                 {rooms.map(r => (
                   <option key={r._id} value={r._id}>{r.name} ({r.code})</option>
                 ))}
               </select>
             </div>
             <div>
               <label className="text-secondary text-sm block mb-1">Justification</label>
               <textarea 
                  className="input-field" 
                  rows="3" 
                  placeholder="Explain why this upgrade is necessary..." 
                  value={proposalForm.description} 
                  onChange={e => setProposalForm({...proposalForm, description: e.target.value})} 
                />
             </div>
             <div>
               <label className="text-secondary text-sm block mb-1">Requested Hardware (New Config)</label>
               <textarea 
                  className="input-field" 
                  rows="3" 
                  placeholder="+ 5x Daikin 1.5T Inverter AC (1200W)" 
                  value={proposalForm.diffNext} 
                  onChange={e => setProposalForm({...proposalForm, diffNext: e.target.value})} 
                />
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
        .z-\[60\] { z-index: 60; }
        .backdrop-blur-sm { backdrop-filter: blur(4px); }
        .bg-black\\/60 { background-color: rgba(0, 0, 0, 0.6); }
        .max-h-\\[90vh\\] { max-height: 90vh; }
        .overflow-y-auto { overflow-y: auto; }
        .gap-3 { gap: 0.75rem; }
        .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
      `}</style>
    </div>
  );
}
