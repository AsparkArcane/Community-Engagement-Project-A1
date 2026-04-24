import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import api from '../api';
import ProposalViewer from '../components/ProposalViewer';
import NotificationCenter from '../components/NotificationCenter';
import AuditTrail from '../components/AuditTrail';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalKWh: 0, totalCost: 0, loading: true });
  const [recommendations, setRecommendations] = useState([]);
  const [pendingProposalsCount, setPendingProposalsCount] = useState(0);
  const [trendsData, setTrendsData] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    fetchGlobalConsumption();
    fetchRecommendations();
    fetchPendingProposals();
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    try {
      const res = await api.get('/consumption/trends/global');
      setTrendsData(res.data);
    } catch (err) {
      console.error('Failed to load trends data');
    }
  };

  const fetchGlobalConsumption = async () => {
    try {
      const res = await api.get('/consumption/global');
      setStats({
        totalKWh: res.data.totalKWh || 0,
        totalCost: res.data.totalCost || 0,
        loading: false
      });
    } catch (err) {
      console.error(err);
      setStats(s => ({ ...s, loading: false }));
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await api.get('/reports/recommendations/global');
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error('Failed to load recommendations');
    }
  };

  const fetchPendingProposals = async () => {
    try {
      const res = await api.get('/proposals');
      setPendingProposalsCount(res.data.filter(p => p.status === 'pending' || p.status === 'resubmitted').length);
    } catch (err) {
      console.error('Failed to parse proposals');
    }
  };

  const handleGeneratePDF = async () => {
    setPdfLoading(true);
    try {
      toast.loading('Generating PDF report...', { id: 'pdf' });
      const res = await api.get('/reports/pdf/global', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `VJTI-Energy-Report-${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF report downloaded', { id: 'pdf' });
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('Failed to generate PDF report', { id: 'pdf' });
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ textAlign: 'left' }}>
      <div className="flex items-center justify-between mb-4">
        <h2>Admin Overview</h2>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={handleGeneratePDF} disabled={pdfLoading}>
            {pdfLoading ? 'Generating...' : 'Generate PDF Report'}
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3 className="text-secondary" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Campus Total Consumption</h3>
          <p className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
            {stats.loading ? '...' : `${(stats.totalKWh / 1000).toFixed(2)} MWh`}
          </p>
          <p className="text-muted text-sm">Dynamic Engine Analytics</p>
        </div>
        <div className="card">
          <h3 className="text-secondary" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Pending Proposals</h3>
          <p className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
            {pendingProposalsCount}
          </p>
          <p className={pendingProposalsCount > 0 ? 'text-warning text-sm' : 'text-success text-sm'}>
            {pendingProposalsCount > 0 ? 'Requires administrative review' : 'Up to date'}
          </p>
        </div>
        <div className="card">
          <h3 className="text-secondary" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Current Tariff Bill</h3>
          <p className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
            {stats.loading ? '...' : `Rs ${stats.totalCost.toLocaleString()}`}
          </p>
          <p className="text-muted text-sm">Estimated for current month</p>
        </div>
      </div>

      <div className="card mb-4" style={{ border: '1px solid var(--brand-primary)', boxShadow: '0 0 20px rgba(0,240,255,0.05)', textAlign: 'left' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 className="text-gradient" style={{ marginBottom: '0.35rem' }}>Engine Recommendations</h3>
          <p className="text-muted text-sm">Each recommendation is stacked in a single vertical list for easier scanning.</p>
        </div>
        {recommendations.length === 0 ? (
          <p className="text-muted text-sm">Collecting footprint baseline data. Ensure rooms are populated with active appliances.</p>
        ) : (
          <ol
            className="text-sm"
            style={{
              maxHeight: '24rem',
              overflowY: 'auto',
              paddingRight: '0.25rem',
              paddingLeft: '1.4rem',
              margin: 0,
              lineHeight: 1.7,
              overscrollBehavior: 'contain'
            }}
          >
            {recommendations.map((rec, index) => (
              <li key={index} style={{ marginBottom: '0.45rem' }}>
                {rec}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="card mb-4">
        <h3 className="mb-3">Energy Trends (MWh)</h3>
        <div style={{ height: '350px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
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
              <Area type="monotone" dataKey="consumption" stroke="#00f0ff" strokeWidth={3} fillOpacity={1} fill="url(#colorCons)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid admin-bottom-grid" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 className="text-secondary mb-2">Pending Approvals</h3>
          <ProposalViewer />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <NotificationCenter />
          <AuditTrail />
        </div>
      </div>

      <style>{`
        .admin-bottom-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (max-width: 960px) {
          .admin-bottom-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
