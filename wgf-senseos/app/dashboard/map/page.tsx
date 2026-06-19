'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, limit, orderBy } from 'firebase/firestore';
import type { Site, Zone, Sensor, Detection } from '@uwsc/core/types';
import { useSimulation } from '@/hooks/useSimulation';
import FloorPlan3D from '@/components/floor-plan-3d';

interface MapPerson {
  id: string;
  x: number;
  y: number;
  type: 'known' | 'unknown' | 'fall';
  label: string;
  trail: { x: number; y: number }[];
}

export default function MapPage() {
  const { senseUser } = useAuth();
  const organizationId = senseUser?.organizationId;

  const { state, start, stop, changeScenario, SCENARIO_LABELS } = useSimulation();
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);
  const [hoveredSensorId, setHoveredSensorId] = useState<string | null>(null);
  const SIM_ONLY = process.env.NEXT_PUBLIC_SIMULATION_ONLY !== 'false';

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [zones, setZones] = useState<Zone[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [persons, setPersons] = useState<MapPerson[]>([]);
  const [hoverZone, setHoverZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trails, setTrails] = useState<Record<string, { x: number; y: number }[]>>({});
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  // Auto-start simulation in demo mode
  useEffect(() => {
    if (SIM_ONLY && !state.isRunning) {
      start();
    }
  }, [SIM_ONLY, state.isRunning, start]);

  // 1. Fetch sites and auto-seed if empty
  useEffect(() => {
    if (SIM_ONLY) {
      setSites([{
        id: 'site_demo_01',
        organizationId: 'org_demo',
        name: 'Casa Principal (Simulada)',
        address: 'Rua das Flores 123, Lisboa',
        widthMeters: 10,
        heightMeters: 8,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }]);
      setSelectedSiteId('site_demo_01');
      setLoading(false);
      return;
    }

    if (!db || !organizationId) return;

    const q = query(collection(db, 'sites'), where('organizationId', '==', organizationId));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list: Site[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Site);
      });

      if (list.length === 0 && !loading) {
        // Seeding default demo site
        const defaultSiteId = `site_demo_${organizationId}`;
        const defaultSite: Site = {
          id: defaultSiteId,
          organizationId,
          name: 'Casa Principal',
          address: 'Rua das Flores 123, Lisboa',
          widthMeters: 10,
          heightMeters: 8,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        try {
          await setDoc(doc(db, 'sites', defaultSiteId), defaultSite);

          // Seed zones
          const defaultZones = [
            { id: 'z1', name: 'Sala', x: 5, y: 5, width: 40, height: 50, type: 'room', color: 'rgba(0,212,255,0.08)' },
            { id: 'z2', name: 'Cozinha', x: 50, y: 5, width: 45, height: 30, type: 'room', color: 'rgba(16,217,138,0.08)' },
            { id: 'z3', name: 'Corredor', x: 5, y: 60, width: 30, height: 20, type: 'corridor', color: 'rgba(124,58,237,0.08)' },
            { id: 'z4', name: 'Quarto', x: 50, y: 40, width: 45, height: 55, type: 'bedroom', color: 'rgba(245,158,11,0.08)' },
          ];

          for (const z of defaultZones) {
            await setDoc(doc(db, 'zones', `${defaultSiteId}_${z.id}`), {
              ...z,
              siteId: defaultSiteId,
              organizationId,
              isRestricted: false,
              createdAt: Date.now(),
            });
          }

          // Seed default sensors
          const defaultSensors = [
            { id: 'sensor_a', name: 'Sensor A — Sala', type: 'wifi_csi', status: 'online', x: 20, y: 20, isSimulated: false },
            { id: 'sensor_b', name: 'Sensor B — Quarto', type: 'wifi_csi', status: 'online', x: 75, y: 65, isSimulated: false },
          ];

          for (const s of defaultSensors) {
            await setDoc(doc(db, 'sensors', s.id), {
              ...s,
              siteId: defaultSiteId,
              organizationId,
              macAddress: 'B4:E6:2D:AA:11:' + (s.id === 'sensor_a' ? '22' : '44'),
              firmwareVersion: 'v1.0.0',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }

        } catch (err) {
          console.error("Error seeding default site data:", err);
        }
      } else {
        setSites(list);
        if (list.length > 0 && !selectedSiteId) {
          setSelectedSiteId(list[0].id);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [organizationId, loading, selectedSiteId, SIM_ONLY]);

  // 2. Fetch zones for selected site
  useEffect(() => {
    if (SIM_ONLY) {
      setZones([
        { id: 'z1', name: 'Sala', x: 5, y: 5, width: 40, height: 50, siteId: 'site_demo_01', organizationId: 'org_demo', isRestricted: false, createdAt: Date.now() },
        { id: 'z2', name: 'Cozinha', x: 50, y: 5, width: 45, height: 30, siteId: 'site_demo_01', organizationId: 'org_demo', isRestricted: false, createdAt: Date.now() },
        { id: 'z3', name: 'Corredor', x: 5, y: 60, width: 30, height: 20, siteId: 'site_demo_01', organizationId: 'org_demo', isRestricted: false, createdAt: Date.now() },
        { id: 'z4', name: 'Quarto', x: 50, y: 40, width: 45, height: 55, siteId: 'site_demo_01', organizationId: 'org_demo', isRestricted: false, createdAt: Date.now() },
      ] as Zone[]);
      return;
    }

    if (!db || !selectedSiteId) return;

    const q = query(collection(db, 'zones'), where('siteId', '==', selectedSiteId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Zone[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Zone);
      });
      setZones(list);
    });

    return () => unsubscribe();
  }, [selectedSiteId, SIM_ONLY]);

  const liveSensorList = (state as any).sensorList || [];

  // 3. Sync and map sensors dynamically from server state (Fase 6)
  useEffect(() => {
    if (liveSensorList.length > 0) {
      const merged = liveSensorList.map((ls: any) => {
        let x = 30;
        let y = 30;
        if (ls.id.includes('sensor_a') || ls.id.includes('sensor-a') || ls.id.includes('001')) {
          x = 20;
          y = 20;
        } else if (ls.id.includes('sensor_b') || ls.id.includes('sensor-b') || ls.id.includes('002')) {
          x = 75;
          y = 65;
        }
        return {
          ...ls,
          x: ls.x ?? x,
          y: ls.y ?? y,
        };
      });
      setSensors(merged);
    } else if (SIM_ONLY) {
      setSensors([
        { id: 'sensor_a', name: 'Sensor A — Sala', type: 'wifi_csi', status: 'offline', x: 20, y: 20, isSimulated: true, siteId: 'site_demo_01', organizationId: 'org_demo', macAddress: 'B4:E6:2D:AA:11:22', firmwareVersion: 'v1.0.0', createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'sensor_b', name: 'Sensor B — Quarto', type: 'wifi_csi', status: 'offline', x: 75, y: 65, isSimulated: true, siteId: 'site_demo_01', organizationId: 'org_demo', macAddress: 'B4:E6:2D:AA:11:44', firmwareVersion: 'v1.0.0', createdAt: Date.now(), updatedAt: Date.now() },
      ] as Sensor[]);
    }
  }, [liveSensorList, SIM_ONLY]);

  // 4. Map server-state detections to people on the map (Fase 6)
  useEffect(() => {
    if (!state.isRunning) {
      setPersons([]);
      return;
    }

    const activePersons: MapPerson[] = [];
    const latestDet = state.detections[state.detections.length - 1];
    
    if (latestDet && latestDet.personCount > 0 && latestDet.locationX !== undefined && latestDet.locationY !== undefined) {
      const type: 'known' | 'unknown' | 'fall' =
        latestDet.type === 'fall' ? 'fall' : latestDet.privacyHash ? 'known' : 'unknown';

      for (let i = 0; i < latestDet.personCount; i++) {
        const offsetX = i === 0 ? 0 : (i === 1 ? -6 : i === 2 ? 6 : -3);
        const offsetY = i === 0 ? 0 : (i === 1 ? 6 : i === 2 ? -6 : -3);
        
        const pLabel = type === 'unknown' 
          ? `Desconhecido ${i > 0 ? i + 1 : ''}` 
          : type === 'fall' 
            ? '⚠️ Queda' 
            : `Pessoa ${i + 1} (${latestDet.privacyHash?.slice(0, 6) || 'N/A'})`;

        activePersons.push({
          id: `${latestDet.id}_${i}`,
          x: Math.min(95, Math.max(5, latestDet.locationX + offsetX)),
          y: Math.min(95, Math.max(5, latestDet.locationY + offsetY)),
          type,
          label: pLabel,
          trail: [],
        });
      }
    }

    setPersons(activePersons);
  }, [state.detections, state.isRunning]);

  // Keep track of trails in a state map
  useEffect(() => {
    if (persons.length === 0) {
      setTrails({});
      return;
    }

    setTrails(prev => {
      const nextTrails = { ...prev };
      
      persons.forEach(p => {
        const id = p.label;
        const currentTrail = nextTrails[id] || [];
        const lastPoint = currentTrail[currentTrail.length - 1];
        if (!lastPoint || lastPoint.x !== p.x || lastPoint.y !== p.y) {
          nextTrails[id] = [...currentTrail.slice(-8), { x: p.x, y: p.y }];
        }
      });
      
      Object.keys(nextTrails).forEach(key => {
        if (!persons.some(p => p.label === key)) {
          delete nextTrails[key];
        }
      });
      
      return nextTrails;
    });
  }, [persons]);

  const personColor = (type: MapPerson['type']) =>
    type === 'unknown' ? '#ef4444' : type === 'fall' ? '#f59e0b' : '#00d4ff';

  const isSensorOnline = (s: Sensor) =>
    s.status === 'online' || (s.lastHeartbeatAt && Date.now() - s.lastHeartbeatAt < 60000);

  const hasFall = persons.some(p => p.type === 'fall');

  return (
    <div className="bg-grid bg-radial-glow animate-fade-in" style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, minHeight: '100vh', position: 'relative' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 4, background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🗺️ Mapa Indoor</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Localização em tempo real das perturbações de Wi-Fi · Cobertura Mesh ativada</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="input-field"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            style={{ width: 200, padding: '6px 12px', background: 'rgba(15, 29, 53, 0.65)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
          >
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* ---- Simulation Control ---- */}
      {SIM_ONLY && (
        <div className="glass-card animate-fade-in" style={{
          padding: '20px 24px',
          borderColor: state.isRunning ? 'var(--accent-primary)' : 'var(--border-card)',
          boxShadow: state.isRunning ? '0 0 24px rgba(0, 212, 255, 0.12)' : 'var(--shadow-card)',
          background: 'linear-gradient(135deg, rgba(15, 29, 53, 0.8), rgba(2, 8, 23, 0.8))',
          borderWidth: state.isRunning ? '1.5px' : '1px',
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {state.isRunning && <div className="status-dot online" />}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                  Motor de Simulação CSI (Visualização do Mapa)
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {state.isRunning
                    ? `Cenário ativo: ${SCENARIO_LABELS[state.scenario]} · t=${state.t.toFixed(1)}s · Ocupação: ${state.occupancy} pessoa(s)`
                    : 'Clica em Iniciar para simular dados CSI em tempo real'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, position: 'relative', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowScenarioMenu(!showScenarioMenu)}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: 12 }}
                >
                  {SCENARIO_LABELS[state.scenario]} ▾
                </button>
                {showScenarioMenu && (
                  <div style={{
                    position: 'absolute', top: '110%', right: 0, zIndex: 50,
                    background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                    borderRadius: 10, padding: 6, minWidth: 220,
                    boxShadow: 'var(--shadow-elevated)',
                  }}>
                    {(Object.entries(SCENARIO_LABELS) as [typeof state.scenario, string][]).map(([key, label]) => (
                      <button key={key} onClick={() => {
                        changeScenario(key);
                        setShowScenarioMenu(false);
                      }} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 12px', background: state.scenario === key ? 'rgba(0,212,255,0.1)' : 'transparent',
                        color: state.scenario === key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      }}>{label}</button>
                    ))}
                  </div>
                )}
              </div>

              {state.isRunning ? (
                <button onClick={stop} className="btn-danger" style={{ padding: '8px 16px', fontSize: 13 }}>
                  ⏹ Parar
                </button>
              ) : (
                <button onClick={() => start()} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                  ▶ Iniciar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: 30, height: 30 }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 20, alignItems: 'start', zIndex: 10 }}>

          {/* Map canvas */}
          <div className="glass-card" style={{
            padding: 16,
            aspectRatio: '16/10',
            position: 'relative',
            overflow: 'hidden',
            border: hasFall ? '1.5px solid #ef4444' : '1px solid var(--border-card)',
            boxShadow: hasFall ? '0 0 24px rgba(239, 68, 68, 0.25)' : 'var(--shadow-card)',
            transition: 'all 0.3s ease',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              background: 'linear-gradient(180deg, rgba(2, 8, 23, 0.95), rgba(15, 29, 53, 0.75))',
              borderRadius: 8,
              border: '1.5px solid rgba(0, 212, 255, 0.12)',
              boxShadow: 'inset 0 0 20px rgba(0, 212, 255, 0.05)',
            }}>

              {/* View Mode Toggle */}
              <div style={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 10,
                display: 'flex',
                gap: 4,
                background: 'rgba(0,0,0,0.5)',
                borderRadius: 6,
                padding: 4,
              }}>
                <button
                  onClick={() => setViewMode('2d')}
                  style={{
                    padding: '4px 12px',
                    fontSize: 11,
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === '2d' ? 'rgba(0, 212, 255, 0.3)' : 'transparent',
                    color: viewMode === '2d' ? '#00d4ff' : 'var(--text-secondary)',
                  }}
                >
                  2D
                </button>
                <button
                  onClick={() => setViewMode('3d')}
                  style={{
                    padding: '4px 12px',
                    fontSize: 11,
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === '3d' ? 'rgba(0, 212, 255, 0.3)' : 'transparent',
                    color: viewMode === '3d' ? '#00d4ff' : 'var(--text-secondary)',
                  }}
                >
                  3D
                </button>
              </div>

              {/* Radar Scanning Sweep Line */}
              {viewMode === '2d' && (
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'conic-gradient(from 0deg at 50% 50%, rgba(0, 212, 255, 0.05) 0deg, transparent 120deg, transparent 360deg)',
                animation: 'radar-sweep 8s linear infinite',
                pointerEvents: 'none',
                zIndex: 2,
              }} />
              )}

              {/* 3D View */}
              {viewMode === '3d' && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
                  <FloorPlan3D
                    walls={[]}
                    sensors={sensors.map(s => ({
                      id: s.id,
                      x: (s.x / 100) * 10 - 5,
                      y: (s.y / 100) * 8 - 4,
                      z: 0,
                      antennas: 3,
                    }))}
                    width={800}
                    height={600}
                  />
                </div>
              )}

              {/* Grid (2D only) */}
              {viewMode === '2d' && (
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <g key={i}>
                    <line x1={`${(i + 1) * 10}%`} y1="0" x2={`${(i + 1) * 10}%`} y2="100%" stroke="#00d4ff" strokeWidth="0.5" />
                    <line x1="0" y1={`${(i + 1) * 10}%`} x2="100%" y2={`${(i + 1) * 10}%`} stroke="#00d4ff" strokeWidth="0.5" />
                  </g>
                ))}
              </svg>
              )}

              {/* Zones */}
              {zones.map(zone => (
                <div
                  key={zone.id}
                  onMouseEnter={() => setHoverZone(zone.id)}
                  onMouseLeave={() => setHoverZone(null)}
                  style={{
                    position: 'absolute',
                    left: `${zone.x}%`, top: `${zone.y}%`,
                    width: `${zone.width}%`, height: `${zone.height}%`,
                    background: hoverZone === zone.id ? (zone.color || 'rgba(255,255,255,0.05)').replace('0.08', '0.15') : (zone.color || 'rgba(255,255,255,0.05)'),
                    border: `1px dashed ${(zone.color || 'rgba(255,255,255,0.1)').replace('0.08', '0.4')}`,
                    borderRadius: 6, transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'flex-start', padding: 8,
                  }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {zone.name}
                  </span>
                </div>
              ))}

              {/* Trails */}
              {Object.entries(trails).map(([personLabel, points]) => {
                const person = persons.find(p => p.label === personLabel);
                const color = person ? personColor(person.type) : '#00d4ff';
                if (points.length < 2) return null;
                return (
                  <svg key={`trail-${personLabel}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }}>
                    {points.map((p, idx) => {
                      if (idx === 0) return null;
                      const prev = points[idx - 1];
                      const opacity = idx / points.length;
                      return (
                        <g key={idx}>
                          <line
                            x1={`${prev.x}%`} y1={`${prev.y}%`}
                            x2={`${p.x}%`} y2={`${p.y}%`}
                            stroke={color}
                            strokeWidth="2.5"
                            strokeDasharray="4, 4"
                            strokeOpacity={opacity * 0.45}
                          />
                          <circle
                            cx={`${p.x}%`} cy={`${p.y}%`}
                            r="4"
                            fill={color}
                            fillOpacity={opacity * 0.7}
                            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                          />
                        </g>
                      );
                    })}
                  </svg>
                );
              })}

              {/* Sensor beams */}
              {sensors.map(sensor => isSensorOnline(sensor) && (
                <div key={`beam-${sensor.id}`}>
                  <div style={{
                    position: 'absolute',
                    left: `${sensor.x}%`, top: `${sensor.y}%`,
                    width: 140, height: 140,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    border: '1px solid rgba(16, 217, 138, 0.12)',
                    background: 'radial-gradient(circle, rgba(16, 217, 138, 0.03) 0%, transparent 75%)',
                    animation: 'sim-pulse 3s infinite ease-out',
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: `${sensor.x}%`, top: `${sensor.y}%`,
                    width: 80, height: 80,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    border: '1px solid rgba(16, 217, 138, 0.06)',
                    animation: 'sim-pulse 2s infinite ease-out',
                    animationDelay: '1s',
                    pointerEvents: 'none',
                  }} />
                </div>
              ))}

              {/* Sensors */}
              {sensors.map(sensor => {
                const online = isSensorOnline(sensor);
                const isHovered = hoveredSensorId === sensor.id;
                return (
                  <div key={sensor.id}
                    onMouseEnter={() => setHoveredSensorId(sensor.id)}
                    onMouseLeave={() => setHoveredSensorId(null)}
                    style={{
                      position: 'absolute',
                      left: `${sensor.x}%`, top: `${sensor.y}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isHovered ? 100 : 10,
                      cursor: 'pointer',
                    }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: online ? 'var(--status-online)' : 'var(--status-offline)',
                      border: '2.5px solid rgba(255,255,255,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12,
                      boxShadow: online ? '0 0 16px var(--status-online), inset 0 0 8px rgba(255,255,255,0.3)' : 'none',
                      transition: 'all 0.2s ease',
                      transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                    }}>📡</div>

                    {isHovered && (
                      <div className="glass-card animate-fade-in" style={{
                        position: 'absolute',
                        top: '125%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '12px 14px',
                        minWidth: 220,
                        zIndex: 999,
                        background: 'rgba(2, 8, 23, 0.95)',
                        border: `1.5px solid ${online ? 'var(--status-online)' : 'var(--status-offline)'}88`,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                        borderRadius: 8,
                        fontSize: 11,
                        color: 'var(--text-primary)',
                      }}>
                        <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                          <span>{sensor.name}</span>
                          <span style={{ color: online ? 'var(--status-online)' : 'var(--status-offline)' }}>
                            {online ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'var(--font-mono)' }}>
                          <div><span style={{ color: 'var(--text-muted)' }}>IP:</span> {sensor.ipAddress || '—'}</div>
                          <div><span style={{ color: 'var(--text-muted)' }}>MAC:</span> {sensor.macAddress || '—'}</div>
                          {online && (
                            <>
                              <div><span style={{ color: 'var(--text-muted)' }}>CPU:</span> {sensor.cpuUsage?.toFixed(1) || '0.0'}%</div>
                              <div><span style={{ color: 'var(--text-muted)' }}>RAM:</span> {sensor.memoryUsage?.toFixed(0) || '0'}MB</div>
                              <div><span style={{ color: 'var(--text-muted)' }}>RSSI:</span> -58 dBm</div>
                              <div><span style={{ color: 'var(--text-muted)' }}>Subrede:</span> {sensor.ipAddress === '127.0.0.1' ? 'Sala (Local)' : 'Quarto (Mesh)'}</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Persons */}
              {persons.map(person => (
                <div key={person.id} style={{
                  position: 'absolute',
                  left: `${person.x}%`, top: `${person.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 20, transition: 'left 0.8s ease, top 0.8s ease',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: personColor(person.type) + '22',
                    border: `2.5px solid ${personColor(person.type)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14,
                    boxShadow: `0 0 16px ${personColor(person.type)}`,
                    animation: person.type === 'fall' ? 'pulse-online 1s infinite' : 'sim-pulse 2s infinite',
                  }}>
                    {person.type === 'unknown' ? '❓' : person.type === 'fall' ? '🚨' : '👤'}
                  </div>
                  <div style={{
                    position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(2, 8, 23, 0.95)', padding: '3px 8px', borderRadius: 6,
                    fontSize: 9, color: personColor(person.type), whiteSpace: 'nowrap',
                    border: `1.5px solid ${personColor(person.type)}44`,
                    fontWeight: 700,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                  }}>
                    {person.label}
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {persons.length === 0 && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 12,
                  color: 'var(--text-muted)',
                }}>
                  <span style={{ fontSize: 32 }}>🗺️</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Sem perturbações humanas detectadas neste momento</span>
                </div>
              )}
            </div>
          </div>

          {/* Legend & Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="glass-card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Legenda</h3>
              {[
                { icon: '👤', color: '#00d4ff', label: 'Pessoa Registada' },
                { icon: '❓', color: '#ef4444', label: 'Desconhecido / Intruso' },
                { icon: '🚨', color: '#f59e0b', label: 'Possível Queda' },
                { icon: '📡', color: '#10d98a', label: 'Sensor Wi-Fi' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: item.color + '22', border: `1px solid ${item.color}66`, fontSize: 11,
                  }}>{item.icon}</div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                </div>
              ))}
            </div>

            {persons.length > 0 && (
              <div className="glass-card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Perturbações</h3>
                {persons.map(p => (
                  <div key={p.id} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span style={{ color: personColor(p.type) }}>{p.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 6, color: 'var(--text-muted)' }}>
                      X:{p.x.toFixed(0)}% Y:{p.y.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
