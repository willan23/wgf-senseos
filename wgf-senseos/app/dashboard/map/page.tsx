'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, limit, orderBy } from 'firebase/firestore';
import type { Site, Zone, Sensor, Detection } from '@uwsc/core/types';

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
  const organizationId = senseUser?.organizationId || 'org_demo';

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [zones, setZones] = useState<Zone[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [persons, setPersons] = useState<MapPerson[]>([]);
  const [hoverZone, setHoverZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch sites and auto-seed if empty
  useEffect(() => {
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
  }, [organizationId, loading, selectedSiteId]);

  // 2. Fetch zones for selected site
  useEffect(() => {
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
  }, [selectedSiteId]);

  // 3. Fetch sensors for selected site
  useEffect(() => {
    if (!db || !selectedSiteId) return;

    const q = query(collection(db, 'sensors'), where('siteId', '==', selectedSiteId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Sensor[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Sensor);
      });
      setSensors(list);
    });

    return () => unsubscribe();
  }, [selectedSiteId]);

  // 4. Fetch real-time detections and map them to people on the map
  useEffect(() => {
    if (!db || !selectedSiteId) return;

    // Listen to latest detections in the last 15 seconds
    const fifteenSecsAgo = Date.now() - 15000;
    const q = query(
      collection(db, 'detections'),
      where('siteId', '==', selectedSiteId),
      where('timestamp', '>=', fifteenSecsAgo),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activePersons: MapPerson[] = [];

      snapshot.forEach((doc) => {
        const det = doc.data() as Detection;
        if (det.personCount > 0 && det.locationX !== undefined && det.locationY !== undefined) {
          const type: 'known' | 'unknown' | 'fall' =
            det.type === 'fall' ? 'fall' : det.privacyHash ? 'known' : 'unknown';

          activePersons.push({
            id: doc.id,
            x: det.locationX ?? 50,
            y: det.locationY ?? 50,
            type,
            label: type === 'unknown' ? 'Desconhecido' : type === 'fall' ? '⚠️ Queda' : `Pessoa (${det.privacyHash?.slice(0,6)})`,
            trail: [],
          });
        }
      });

      // Keep up to date list of active persons
      setPersons(activePersons);
    }, (err) => {
      console.error("Error listening to detections:", err);
    });

    return () => unsubscribe();
  }, [selectedSiteId]);

  const personColor = (type: MapPerson['type']) =>
    type === 'unknown' ? '#ef4444' : type === 'fall' ? '#f59e0b' : '#00d4ff';

  const isSensorOnline = (s: Sensor) =>
    s.status === 'online' || (s.lastHeartbeatAt && Date.now() - s.lastHeartbeatAt < 60000);

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>🗺️ Mapa Indoor</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Localização em tempo real das pessoas detetadas · Dados 100% reais</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="input-field"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            style={{ width: 200, padding: '6px 12px' }}
          >
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: 30, height: 30 }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 20, alignItems: 'start' }}>

          {/* Map canvas */}
          <div className="glass-card" style={{ padding: 16, aspectRatio: '16/10', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', position: 'relative', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>

              {/* Grid */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <g key={i}>
                    <line x1={`${(i + 1) * 10}%`} y1="0" x2={`${(i + 1) * 10}%`} y2="100%" stroke="#00d4ff" strokeWidth="0.5" />
                    <line x1="0" y1={`${(i + 1) * 10}%`} x2="100%" y2={`${(i + 1) * 10}%`} stroke="#00d4ff" strokeWidth="0.5" />
                  </g>
                ))}
              </svg>

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
                    border: `1px solid ${(zone.color || 'rgba(255,255,255,0.1)').replace('0.08', '0.4')}`,
                    borderRadius: 4, transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'flex-start', padding: 6,
                  }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                    {zone.name}
                  </span>
                </div>
              ))}

              {/* Sensor beams */}
              {sensors.map(sensor => isSensorOnline(sensor) && (
                <div key={`beam-${sensor.id}`}>
                  <div style={{
                    position: 'absolute',
                    left: `${sensor.x}%`, top: `${sensor.y}%`,
                    width: 80, height: 80,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)',
                    animation: 'sim-pulse 2s ease-in-out infinite',
                    pointerEvents: 'none',
                  }} />
                </div>
              ))}

              {/* Sensors */}
              {sensors.map(sensor => {
                const online = isSensorOnline(sensor);
                return (
                  <div key={sensor.id} style={{
                    position: 'absolute',
                    left: `${sensor.x}%`, top: `${sensor.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: online ? 'var(--status-online)' : 'var(--status-offline)',
                      border: '2px solid rgba(255,255,255,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, boxShadow: online ? '0 0 12px var(--status-online)' : 'none',
                    }} title={sensor.name}>📡</div>
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
                    width: 28, height: 28, borderRadius: '50%',
                    background: personColor(person.type) + '22',
                    border: `2px solid ${personColor(person.type)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, boxShadow: `0 0 12px ${personColor(person.type)}66`,
                    animation: 'sim-pulse 2s ease-in-out infinite',
                  }}>
                    {person.type === 'unknown' ? '❓' : person.type === 'fall' ? '⚠️' : '👤'}
                  </div>
                  <div style={{
                    position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(2,8,23,0.9)', padding: '2px 6px', borderRadius: 4,
                    fontSize: 9, color: personColor(person.type), whiteSpace: 'nowrap',
                    border: `1px solid ${personColor(person.type)}44`,
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
                  <span style={{ fontSize: 13 }}>Sem perturbações humanas detectadas neste momento</span>
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
                { icon: '⚠️', color: '#f59e0b', label: 'Possível Queda' },
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
