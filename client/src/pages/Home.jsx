import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api';

export default function Home() {
  const [globalStats, setGlobalStats] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    api.get('/consumption/public/global')
      .then(res => {
        setGlobalStats({
          totalKWh: res.data.totalKWh || 0,
          totalCost: res.data.totalCost || 0,
          roomCount: res.data.rooms?.length || 0,
          topRooms: (res.data.rooms || []).sort((a, b) => b.totalKWh - a.totalKWh).slice(0, 3)
        });
      })
      .catch(() => console.error('Failed to fetch public stats'));

    api.get('/consumption/public/trends/global')
      .then(res => setTrendData(res.data || []))
      .catch(() => console.error('Failed to fetch public trends'));

    api.get('/faults/public/feed')
      .then(res => setComplaints(res.data || []))
      .catch(() => console.error('Failed to fetch complaints'));
  }, []);

  const complaintStats = useMemo(() => {
    return complaints.reduce((summary, complaint) => {
      summary.total += 1;
      summary[complaint.status || 'open'] = (summary[complaint.status || 'open'] || 0) + 1;
      return summary;
    }, { total: 0, open: 0, in_progress: 0, resolved: 0 });
  }, [complaints]);

  const complaintChartData = [
    { name: 'Open', value: complaintStats.open },
    { name: 'In Progress', value: complaintStats.in_progress },
    { name: 'Resolved', value: complaintStats.resolved }
  ];

  return (
    <div className="home-container">
      <nav className="navbar home-navbar">
        <div className="navbar-brand">
          <Link to="/" className="text-gradient" style={{ fontWeight: 'bold', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/vjti-logo.png" alt="VJTI Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
            VJTI Energy
          </Link>
        </div>

        <div className="navbar-user">
          <Link to="/login" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-full)' }}>Login</Link>
        </div>
      </nav>

      <header className="home-hero">
        <div className="home-hero-content">
          <p className="home-kicker">Campus Energy Pulse</p>
          <h1>Track electricity usage, complaint resolution, and efficiency signals across VJTI.</h1>
        </div>
      </header>

      <main className="home-main">
        <section className="home-section">
          <div className="home-section-heading">
            <h2>Current Electricity Status</h2>
            <p className="text-muted">Read-only campus indicators based on the latest tracked consumption and maintenance data.</p>
          </div>

          {globalStats && (
            <div className="home-metric-grid">
              <div className="home-metric-card">
                <p className="home-metric-label">Campus Consumption</p>
                <p className="home-metric-value">{(globalStats.totalKWh / 1000).toFixed(2)} MWh</p>
                <p className="text-muted text-sm">Current tracked month</p>
              </div>
              <div className="home-metric-card">
                <p className="home-metric-label">Estimated Electricity Bill</p>
                <p className="home-metric-value">Rs {globalStats.totalCost.toLocaleString()}</p>
                <p className="text-muted text-sm">Live tariff estimate</p>
              </div>
              <div className="home-metric-card">
                <p className="home-metric-label">Monitored Rooms</p>
                <p className="home-metric-value">{globalStats.roomCount}</p>
                <p className="text-muted text-sm">Rooms with consumption visibility</p>
              </div>
            </div>
          )}

          <div className="home-chart-grid">
            <div className="card">
              <h3 className="mb-3">Electricity Trend</h3>
              <p className="text-muted text-sm mb-3">Campus energy movement over the tracked months this year.</p>
              <div style={{ height: '280px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="homeEnergyTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip formatter={value => `${value} MWh`} />
                    <Area type="monotone" dataKey="consumption" stroke="#2563eb" strokeWidth={3} fill="url(#homeEnergyTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="mb-3">Complaint Resolution Status</h3>
              <p className="text-muted text-sm mb-3">Open vs in-progress vs resolved complaints from the public feed.</p>
              <div style={{ height: '280px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={complaintChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {globalStats?.topRooms?.length > 0 && (
            <div className="card">
              <h3 className="mb-3">Highest Current Load Rooms</h3>
              <div className="home-top-room-list">
                {globalStats.topRooms.map(room => (
                  <div key={room.roomId} className="home-top-room-item">
                    <div>
                      <p style={{ fontWeight: 600 }}>{room.roomName}</p>
                      <p className="text-muted text-sm">Monthly draw</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700 }}>{room.totalKWh.toFixed(2)} kWh</p>
                      <p className="text-muted text-sm">Rs {room.totalCost.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="home-section">
          <div className="home-section-heading">
            <h2>Live Complaints And Resolution</h2>
            <p className="text-muted">Recent complaint activity so students, staff, and admins can all see what still needs attention.</p>
          </div>

          <div className="home-complaint-grid">
            <div className="card">
              <h3 className="mb-3">Resolution Overview</h3>
              <div className="home-resolution-pills">
                <div className="home-resolution-pill">
                  <span>Total</span>
                  <strong>{complaintStats.total}</strong>
                </div>
                <div className="home-resolution-pill">
                  <span>Open</span>
                  <strong>{complaintStats.open}</strong>
                </div>
                <div className="home-resolution-pill">
                  <span>In Progress</span>
                  <strong>{complaintStats.in_progress}</strong>
                </div>
                <div className="home-resolution-pill">
                  <span>Resolved</span>
                  <strong>{complaintStats.resolved}</strong>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="mb-3">Operational Intent</h3>
              <p className="text-secondary text-sm" style={{ lineHeight: 1.8 }}>
                This page keeps campus power usage and complaint handling visible in one place so unresolved issues, repeat faults, and high-load areas stay under active review.
              </p>
            </div>
          </div>

          <div className="home-complaints-list">
            {complaints.length === 0 ? (
              <div className="card">
                <p className="text-muted text-sm">No public complaints are available right now.</p>
              </div>
            ) : (
              complaints.map(complaint => (
                <div key={complaint._id} className="card home-complaint-card">
                  <div className="home-complaint-header">
                    <div>
                      <p style={{ fontWeight: 700 }}>{complaint.roomId?.name || 'Unknown Location'}</p>
                      <p className="text-muted text-sm">
                        {complaint.roomId?.code ? `${complaint.roomId.code} • ` : ''}
                        Reported by {complaint.reportedBy?.name || 'Unknown'}
                      </p>
                    </div>
                    <div className="home-complaint-tags">
                      <span className={`status-chip severity-${complaint.severity || 'medium'}`}>{(complaint.severity || 'medium').replace('_', ' ')}</span>
                      <span className={`status-chip status-${complaint.status || 'open'}`}>{(complaint.status || 'open').replace('_', ' ')}</span>
                    </div>
                  </div>
                  <p className="text-secondary text-sm" style={{ lineHeight: 1.75 }}>{complaint.description}</p>
                  <p className="text-muted text-sm" style={{ marginTop: '0.75rem' }}>
                    Logged on {new Date(complaint.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p style={{ color: 'var(--text-muted)' }}>&copy; {new Date().getFullYear()} VJTI Energy System.</p>
      </footer>

      <style>{`
        .home-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 30%, #f8fafc 100%);
        }
        .home-navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border-color);
        }
        .home-hero {
          padding: 5rem 2rem 3rem;
          background:
            radial-gradient(circle at top right, rgba(37, 99, 235, 0.16), transparent 35%),
            linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 64, 175, 0.88));
          color: white;
        }
        .home-hero-content {
          max-width: 1100px;
          margin: 0 auto;
        }
        .home-kicker {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.8rem;
          opacity: 0.8;
          margin-bottom: 1rem;
        }
        .home-hero h1 {
          font-size: clamp(2.4rem, 5vw, 4.25rem);
          max-width: 900px;
          margin-bottom: 1rem;
        }
        .home-subcopy {
          max-width: 760px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 1.05rem;
        }
        .home-main {
          flex: 1;
          width: min(1180px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 2rem 0 4rem;
        }
        .home-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .home-section-heading {
          text-align: left;
        }
        .home-metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }
        .home-metric-card {
          background: white;
          border: 1px solid rgba(37, 99, 235, 0.12);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          box-shadow: var(--shadow-sm);
        }
        .home-metric-label {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin-bottom: 0.45rem;
        }
        .home-metric-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--brand-primary);
          margin-bottom: 0.35rem;
        }
        .home-chart-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.25rem;
        }
        .home-top-room-list {
          display: grid;
          gap: 0.75rem;
        }
        .home-top-room-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
        }
        .home-complaint-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 1.25rem;
        }
        .home-resolution-pills {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
        }
        .home-resolution-pill {
          padding: 1rem;
          border-radius: var(--radius-md);
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .home-complaints-list {
          display: grid;
          gap: 1rem;
        }
        .home-complaint-card {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .home-complaint-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        .home-complaint-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: flex-end;
        }
        .status-chip {
          padding: 0.35rem 0.7rem;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 600;
          text-transform: capitalize;
        }
        .severity-low {
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
        }
        .severity-medium {
          background: rgba(245, 158, 11, 0.16);
          color: #b45309;
        }
        .severity-high {
          background: rgba(239, 68, 68, 0.14);
          color: #b91c1c;
        }
        .status-open {
          background: rgba(239, 68, 68, 0.14);
          color: #b91c1c;
        }
        .status-in_progress {
          background: rgba(59, 130, 246, 0.14);
          color: #1d4ed8;
        }
        .status-resolved {
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
        }
        .home-footer {
          padding: 2rem;
          text-align: center;
          border-top: 1px solid var(--border-color);
          background-color: rgba(255, 255, 255, 0.8);
        }
        @media (max-width: 900px) {
          .home-chart-grid,
          .home-complaint-grid {
            grid-template-columns: 1fr;
          }
          .home-resolution-pills {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .home-complaint-header {
            flex-direction: column;
          }
          .home-complaint-tags {
            justify-content: flex-start;
          }
        }
        @media (max-width: 640px) {
          .home-hero {
            padding: 4rem 1rem 2.5rem;
          }
          .home-main {
            width: min(1180px, calc(100% - 1rem));
          }
          .home-resolution-pills {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
