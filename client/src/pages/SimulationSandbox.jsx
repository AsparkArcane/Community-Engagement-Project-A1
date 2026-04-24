import React, { useEffect, useState } from 'react';
import api from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SimulationSandbox() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [capacity, setCapacity] = useState(5);
  const [simulationData, setSimulationData] = useState(null);
  const [roomConsumption, setRoomConsumption] = useState(null);
  const [scenarioAppliances, setScenarioAppliances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [proposalStatus, setProposalStatus] = useState('');

  const activeRoom = rooms.find(room => room._id === selectedRoom);
  const workingDays = roomConsumption?.workingDays || 0;
  const enabledApplianceCount = scenarioAppliances.filter(appliance => appliance.enabled).length;
  const disabledApplianceCount = scenarioAppliances.length - enabledApplianceCount;

  useEffect(() => {
    api.get('/rooms')
      .then(res => {
        setRooms(res.data);
        if (res.data.length > 0) setSelectedRoom(res.data[0]._id);
      })
      .catch(err => console.error('Error fetching rooms', err));
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;
    setLoading(true);
    api.get(`/solar/payback/${selectedRoom}?month=4&year=2026&panelCapacityKW=${capacity}`)
      .then(res => {
        setSimulationData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Simulation error', err);
        setLoading(false);
        setSimulationData(null);
      });
  }, [selectedRoom, capacity]);

  useEffect(() => {
    if (!selectedRoom) {
      setRoomConsumption(null);
      setScenarioAppliances([]);
      return;
    }

    setScenarioLoading(true);
    Promise.all([
      api.get(`/consumption/room/${selectedRoom}?month=4&year=2026`),
      api.get(`/appliances/room/${selectedRoom}`)
    ])
      .then(([consumptionRes, appliancesRes]) => {
        setRoomConsumption(consumptionRes.data);
        setScenarioAppliances(
          appliancesRes.data.map(appliance => ({
            _id: appliance._id,
            name: appliance.applianceLibraryId?.name || 'Unknown Appliance',
            category: appliance.applianceLibraryId?.category || 'other',
            quantity: appliance.quantity,
            usageHours: appliance.usageHours,
            basePowerW: appliance.overridePowerW || appliance.applianceLibraryId?.powerW || 0,
            powerW: appliance.overridePowerW || appliance.applianceLibraryId?.powerW || 0,
            enabled: true
          }))
        );
      })
      .catch(err => {
        console.error('Scenario control load error', err);
        setRoomConsumption(null);
        setScenarioAppliances([]);
      })
      .finally(() => setScenarioLoading(false));
  }, [selectedRoom]);

  const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

  const updateScenarioAppliance = (id, updates) => {
    setScenarioAppliances(current =>
      current.map(appliance => (
        appliance._id === id ? { ...appliance, ...updates } : appliance
      ))
    );
  };

  const setAllAppliancesEnabled = (enabled) => {
    setScenarioAppliances(current => current.map(appliance => ({ ...appliance, enabled })));
  };

  const resetScenario = () => {
    setScenarioAppliances(current => current.map(appliance => ({
      ...appliance,
      enabled: true,
      powerW: appliance.basePowerW
    })));
  };

  const scenarioMetrics = (() => {
    if (!simulationData) return null;

    const adjustedMonthlyKWh = scenarioAppliances.reduce((total, appliance) => {
      if (!appliance.enabled) return total;
      return total + ((appliance.powerW * appliance.quantity * appliance.usageHours * workingDays) / 1000);
    }, 0);

    const tariff = roomConsumption?.tariff || 0;
    const baselineMonthlyCostINR = +(roomConsumption?.totalCost || 0).toFixed(2);
    const adjustedDailyKWh = workingDays > 0 ? adjustedMonthlyKWh / workingDays : 0;
    const annualSavingINR = +(Math.min(simulationData.dailySolarKWh, adjustedDailyKWh) * tariff * 365).toFixed(2);
    const paybackYears = annualSavingINR > 0 ? +(simulationData.panelCostINR / annualSavingINR).toFixed(1) : null;
    const adjustedMonthlyCostINR = +(adjustedMonthlyKWh * tariff).toFixed(2);
    const paybackTimeline = Array.from({ length: 21 }, (_, year) => ({
      year,
      investment: simulationData.panelCostINR,
      baselineGridSpend: +((baselineMonthlyCostINR * 12) * year).toFixed(2),
      scenarioGridSpend: +((adjustedMonthlyCostINR * 12) * year).toFixed(2)
    }));

    return {
      panelCostINR: simulationData.panelCostINR,
      annualSavingINR,
      paybackYears,
      paybackTimeline,
      adjustedMonthlyKWh: +adjustedMonthlyKWh.toFixed(3),
      adjustedMonthlyCostINR,
      baselineMonthlyCostINR
    };
  })();

  const currentSimulation = scenarioMetrics || simulationData;

  const submitProposal = async () => {
    if (!selectedRoom || !currentSimulation) return;
    try {
      setProposalStatus('submitting');
      await api.post('/proposals', {
        roomId: selectedRoom,
        description: `Install ${capacity} kW Solar Panel array. Expected ROI in ${currentSimulation.paybackYears ?? 'N/A'} years.`,
        diff: {
          prev: { installedSolarKW: 0 },
          next: { installedSolarKW: capacity }
        }
      });
      setProposalStatus('success');
      setTimeout(() => setProposalStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setProposalStatus('error');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-3" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginBottom: '0.2rem' }}>Renewable Sandbox Simulator</h2>
          <p className="text-muted text-sm">Compact controls with live load and bill comparison.</p>
        </div>
      </div>

      <div className="grid simulation-layout" style={{ gap: '1rem' }}>
        <div className="card">
          <h3 className="mb-3">Simulation Parameters</h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 500 }}>Target Room/Facility</label>
            <select
              className="input-field"
              value={selectedRoom}
              onChange={e => setSelectedRoom(e.target.value)}
            >
              <option value="" disabled>Select Room</option>
              {rooms.map(room => (
                <option key={room._id} value={room._id}>{room.name} {room.code ? `(${room.code})` : ''}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 500 }}>
              Solar Panel Capacity: <span className="text-gradient" style={{ fontWeight: 'bold' }}>{capacity} kW</span>
            </label>
            <div className="slider-control-row">
              <button className="btn btn-secondary" type="button" onClick={() => setCapacity(current => clampValue(current - 1, 1, 50))}>-</button>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={capacity}
                onChange={e => setCapacity(Number(e.target.value))}
                onInput={e => setCapacity(Number(e.target.value))}
                className="simulation-slider"
              />
              <button className="btn btn-secondary" type="button" onClick={() => setCapacity(current => clampValue(current + 1, 1, 50))}>+</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>1 kW</span>
              <span>50 kW</span>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div className="compact-room-panel">
              <p className="text-sm" style={{ marginBottom: '0.25rem' }}>
                <strong>{activeRoom?.name || 'No room selected'}</strong>
              </p>
              <p className="text-muted text-sm" style={{ marginBottom: roomConsumption ? '0.2rem' : 0 }}>
                {activeRoom?.code ? `${activeRoom.code} • ${activeRoom.type}` : activeRoom?.type || 'Choose a room to simulate'}
              </p>
              {roomConsumption && (
                <p className="text-muted text-sm">
                  Baseline: {roomConsumption.totalKWh.toFixed(2)} kWh/month across {workingDays} working days
                </p>
              )}
            </div>
          </div>

          <div className="compact-stat-grid" style={{ marginBottom: '1rem' }}>
            <div className="compact-stat-card">
              <p className="text-muted text-sm mb-1">ON</p>
              <p style={{ fontWeight: 700 }}>{enabledApplianceCount}</p>
            </div>
            <div className="compact-stat-card">
              <p className="text-muted text-sm mb-1">OFF</p>
              <p style={{ fontWeight: 700 }}>{disabledApplianceCount}</p>
            </div>
            <div className="compact-stat-card">
              <p className="text-muted text-sm mb-1">Scenario</p>
              <p style={{ fontWeight: 700 }}>{disabledApplianceCount > 0 ? 'Partial' : 'Full'}</p>
            </div>
            {scenarioMetrics && (
              <div className="compact-stat-card compact-stat-emphasis">
                <p className="text-muted text-sm mb-1">Bill</p>
                <p style={{ fontWeight: 700 }}>Rs {scenarioMetrics.adjustedMonthlyCostINR.toLocaleString()}</p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem', gap: '1rem' }}>
              <h4>Appliance Controls</h4>
              <span className="text-muted text-sm">Changes update the simulation below</span>
            </div>

            <div className="simulation-action-row">
              <button className="btn btn-secondary" type="button" onClick={() => setAllAppliancesEnabled(true)}>All ON</button>
              <button className="btn btn-secondary" type="button" onClick={() => setAllAppliancesEnabled(false)}>All OFF</button>
              <button className="btn btn-secondary" type="button" onClick={resetScenario}>Reset</button>
            </div>

            <div className="compact-appliance-list">
              {scenarioLoading ? (
                <div className="compact-appliance-card">
                  <p className="text-muted text-sm">Loading room appliances...</p>
                </div>
              ) : scenarioAppliances.length === 0 ? (
                <div className="compact-appliance-card">
                  <p className="text-muted text-sm">No active appliances found for this room.</p>
                </div>
              ) : (
                scenarioAppliances.map(appliance => (
                  <div key={appliance._id} className="compact-appliance-card">
                    <div className="flex items-center justify-between" style={{ gap: '0.75rem', marginBottom: '0.3rem' }}>
                      <div>
                        <p className="text-sm" style={{ fontWeight: 600, marginBottom: '0.1rem' }}>{appliance.name}</p>
                        <p className="text-muted text-sm">Qty {appliance.quantity} • {appliance.usageHours} hrs/day</p>
                      </div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={appliance.enabled}
                          onChange={e => updateScenarioAppliance(appliance._id, { enabled: e.target.checked })}
                        />
                        <span>{appliance.enabled ? 'ON' : 'OFF'}</span>
                      </label>
                    </div>

                    <div className="simulation-power-grid">
                      <div>
                        <label className="text-secondary text-sm" style={{ display: 'block', marginBottom: '0.2rem' }}>Power Draw</label>
                        <div className="slider-control-row">
                          <button
                            className="btn btn-secondary"
                            type="button"
                            disabled={!appliance.enabled}
                            onClick={() => updateScenarioAppliance(appliance._id, {
                              powerW: clampValue(appliance.powerW - 10, 0, Math.max(appliance.basePowerW * 2, 100))
                            })}
                          >
                            -
                          </button>
                          <input
                            type="range"
                            min="0"
                            max={Math.max(appliance.basePowerW * 2, 100)}
                            step="10"
                            value={appliance.powerW}
                            onChange={e => updateScenarioAppliance(appliance._id, { powerW: Number(e.target.value) })}
                            onInput={e => updateScenarioAppliance(appliance._id, { powerW: Number(e.target.value) })}
                            disabled={!appliance.enabled}
                            className="simulation-slider"
                          />
                          <button
                            className="btn btn-secondary"
                            type="button"
                            disabled={!appliance.enabled}
                            onClick={() => updateScenarioAppliance(appliance._id, {
                              powerW: clampValue(appliance.powerW + 10, 0, Math.max(appliance.basePowerW * 2, 100))
                            })}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        className="input-field"
                        min="0"
                        step="10"
                        value={appliance.powerW}
                        onChange={e => updateScenarioAppliance(appliance._id, {
                          powerW: clampValue(Number(e.target.value) || 0, 0, Math.max(appliance.basePowerW * 2, 100))
                        })}
                        disabled={!appliance.enabled}
                        style={{ width: '6.25rem' }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontWeight: 'bold', marginTop: '1rem' }}
            onClick={submitProposal}
            disabled={proposalStatus === 'submitting' || loading || !currentSimulation}
          >
            {proposalStatus === 'submitting'
              ? 'Submitting...'
              : proposalStatus === 'success'
                ? 'Proposal Sent'
                : 'Submit Sandbox Proposal'}
          </button>
          {proposalStatus === 'error' && <p className="text-danger mt-2 text-sm text-center">Failed to submit proposal</p>}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="mb-3">Feasibility & Bill Impact</h3>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="text-muted animate-pulse">Running simulation models...</p>
            </div>
          ) : currentSimulation ? (
            <>
              <div className="compact-result-grid">
                <div className="compact-result-card">
                  <p className="text-muted text-sm mb-1">Initial Investment</p>
                  <p style={{ fontWeight: 700 }}>Rs {currentSimulation.panelCostINR.toLocaleString()}</p>
                </div>
                <div className="compact-result-card compact-result-green">
                  <p className="text-muted text-sm mb-1">Solar Savings</p>
                  <p style={{ fontWeight: 700 }}>Rs {currentSimulation.annualSavingINR.toLocaleString()}</p>
                </div>
                <div className="compact-result-card">
                  <p className="text-muted text-sm mb-1">Payback</p>
                  <p style={{ fontWeight: 700 }}>{currentSimulation.paybackYears ? `${currentSimulation.paybackYears} Years` : 'N/A'}</p>
                </div>
              </div>

              {scenarioMetrics && roomConsumption && (
                <div className="compact-result-grid" style={{ marginTop: '0.75rem' }}>
                  <div className="compact-result-card">
                    <p className="text-muted text-sm mb-1">Adjusted Load</p>
                    <p style={{ fontWeight: 700 }}>{scenarioMetrics.adjustedMonthlyKWh.toFixed(2)} kWh/month</p>
                  </div>
                  <div className="compact-result-card compact-result-green">
                    <p className="text-muted text-sm mb-1">Adjusted Bill</p>
                    <p style={{ fontWeight: 700 }}>Rs {scenarioMetrics.adjustedMonthlyCostINR.toLocaleString()}</p>
                  </div>
                  <div className="compact-result-card">
                    <p className="text-muted text-sm mb-1">Baseline Bill</p>
                    <p style={{ fontWeight: 700 }}>Rs {scenarioMetrics.baselineMonthlyCostINR.toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div style={{ flex: 1, minHeight: '240px', marginTop: '0.9rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentSimulation.paybackTimeline} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="year" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" tickFormatter={value => 'Rs ' + (value / 1000).toFixed(0) + 'k'} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
                      formatter={value => 'Rs ' + value.toLocaleString()}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="baselineGridSpend" name="Baseline Grid Spend" stroke="#94a3b8" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="scenarioGridSpend" name="Scenario Grid Spend" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="investment" name="Solar Investment" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="text-muted">Select a room to begin simulation. If no rooms are available, please ensure your department has recorded rooms.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .simulation-layout {
          grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
        }
        .compact-room-panel {
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.85rem;
        }
        .compact-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.5rem;
        }
        .compact-stat-card {
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.7rem;
        }
        .compact-stat-emphasis {
          background: rgba(16, 185, 129, 0.06);
          border-color: rgba(16, 185, 129, 0.18);
        }
        .simulation-power-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.55rem;
          align-items: center;
        }
        .simulation-action-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-bottom: 0.6rem;
        }
        .slider-control-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 0.4rem;
          align-items: center;
        }
        .slider-control-row .btn {
          min-width: 2.4rem;
          padding: 0.42rem 0.6rem;
        }
        .simulation-slider {
          width: 100%;
          cursor: pointer;
          accent-color: #2563eb;
        }
        .compact-appliance-list {
          max-height: 17rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          padding-right: 0.2rem;
        }
        .compact-appliance-card {
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.75rem;
        }
        .compact-result-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.6rem;
        }
        .compact-result-card {
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.8rem;
        }
        .compact-result-green {
          background: rgba(16, 185, 129, 0.06);
          border-color: rgba(16, 185, 129, 0.18);
        }
        @media (max-width: 1024px) {
          .simulation-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .compact-stat-grid,
          .compact-result-grid {
            grid-template-columns: 1fr;
          }
          .simulation-power-grid {
            grid-template-columns: 1fr;
          }
          .simulation-action-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
