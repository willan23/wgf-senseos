'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { Sensor, Site } from '@uwsc/core/types';

export default function SensorsPage() {
  const { senseUser } = useAuth();
  const organizationId = senseUser?.organizationId || 'org_demo';

  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states for adding a new sensor
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSensorName, setNewSensorName] = useState('');
  const [newSensorMac, setNewSensorMac] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [sensorType, setSensorType] = useState<'wifi_csi' | 'simulated'>('wifi_csi');

  // Load sensors from Firestore
  useEffect(() => {
    if (!db || !organizationId) return;

    const q = query(collection(db, 'sensors'), where('organizationId', '==', organizationId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Sensor[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Sensor);
      });
      setSensors(list);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching sensors:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organizationId]);

  // Load sites for the dropdown
  useEffect(() => {
    if (!db || !organizationId) return;

    const q = query(collection(db, 'sites'), where('organizationId', '==', organizationId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Site[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Site);
      });
      setSites(list);
      if (list.length > 0) setSelectedSiteId(list[0].id);
    });

    return () => unsubscribe();
  }, [organizationId]);

  const sensor = sensors.find(s => s.id === selected);

  // Action: Add Sensor
  const handleAddSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !organizationId || !newSensorName) return;

    try {
      const { getDoc } = await import('firebase/firestore');
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
      let maxSensors = 1;
      if (orgDoc.exists()) {
        maxSensors = orgDoc.data().maxSensors ?? 1;
      }

      if (sensors.length >= maxSensors) {
        const { toast } = await import('react-hot-toast');
        toast.error(`Limite do plano atingido! O seu plano atual permite no máximo ${maxSensors} sensor(es). Por favor, efetue o upgrade no painel de Faturação.`);
        return;
      }

      const sensorId = `sensor_${Math.random().toString(36).substring(2, 9)}`;
      const newSensor: Partial<Sensor> = {
        id: sensorId,
        name: newSensorName,
        macAddress: newSensorMac || '00:00:00:00:00:00',
        siteId: selectedSiteId || 'site_demo_01',
        type: sensorType,
        status: sensorType === 'simulated' ? 'simulated' : 'offline',
        x: Math.floor(Math.random() * 80) + 10,
        y: Math.floor(Math.random() * 80) + 10,
        organizationId,
        isSimulated: sensorType === 'simulated',
        firmwareVersion: 'v1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc(doc(db, 'sensors', sensorId), newSensor);
      setShowAddModal(false);
      setNewSensorName('');
      setNewSensorMac('');
      const { toast } = await import('react-hot-toast');
      toast.success('Sensor adicionado com sucesso!');
    } catch (err) {
      console.error("Error adding sensor:", err);
      const { toast } = await import('react-hot-toast');
      toast.error('Erro ao adicionar o sensor.');
    }
  };

  // Action: Delete Sensor
  const handleDeleteSensor = async (sensorId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'sensors', sensorId));
      setSelected(null);
    } catch (err) {
      console.error("Error deleting sensor:", err);
    }
  };

  // Action: Restart Sensor (updates heartbeat/status)
  const handleRestartSensor = async (sensorId: string) => {
    if (!db) return;
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'sensors', sensorId), {
        status: 'online',
        lastHeartbeatAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error("Error restarting sensor:", err);
    }
  };

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>📡 Sensores</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Gestão e monitorização dos sensores Wi-Fi do sistema</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>+ Adicionar Sensor</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Online', value: sensors.filter(s => s.status === 'online').length, color: '#10d98a' },
          { label: 'Offline/Simulado', value: sensors.filter(s => s.status !== 'online').length, color: '#ef4444' },
          { label: 'Total', value: sensors.length, color: '#00d4ff' },
        ].map(s => (
          <div key={s.label} className="metric-card">
            <div className="metric-label">{s.label}</div>
            <div className="metric-value" style={{ color: s.color, fontSize: 28 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: 30, height: 30 }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 20 }}>

          {/* Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {sensors.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                Nenhum sensor registado. Clique em "Adicionar Sensor" para criar um.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Nome</th>
                    <th>ID / MAC</th>
                    <th>Tipo</th>
                    <th>Último Heartbeat</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.map(s => (
                    <tr key={s.id} onClick={() => setSelected(selected === s.id ? null : s.id)}
                      style={{ cursor: 'pointer', background: selected === s.id ? 'rgba(0,212,255,0.05)' : undefined }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={`status-dot ${s.status === 'simulated' ? 'online' : s.status}`} />
                          <span style={{ fontSize: 12, color: s.status === 'online' || s.status === 'simulated' ? 'var(--status-online)' : 'var(--status-offline)', fontWeight: 600 }}>
                            {s.status === 'online' ? 'Online' : s.status === 'simulated' ? 'Simulado' : 'Offline'}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                      <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{s.macAddress || s.id}</td>
                      <td>
                        <span className={`badge ${s.isSimulated ? 'badge-yellow' : 'badge-violet'}`}>
                          {s.isSimulated ? 'Simulado' : 'Real Wi-Fi'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {s.lastHeartbeatAt
                          ? new Date(s.lastHeartbeatAt).toLocaleTimeString('pt-PT')
                          : 'Nunca'}
                      </td>
                      <td>
                        <button onClick={e => { e.stopPropagation(); setSelected(selected === s.id ? null : s.id); }}
                          className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}>
                          {selected === s.id ? 'Fechar' : 'Ver detalhes'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail panel */}
          {sensor && (
            <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>{sensor.name}</h2>
                <span className={`status-dot ${sensor.status}`} />
              </div>
              <div className="divider" />
              {[
                { label: 'ID', value: sensor.id },
                { label: 'MAC Address', value: sensor.macAddress || '—' },
                { label: 'Firmware', value: sensor.firmwareVersion || 'v1.0.0' },
                { label: 'Tipo', value: sensor.type },
                { label: 'Posição', value: `X:${sensor.x}% Y:${sensor.y}%` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{item.value}</div>
                </div>
              ))}
              <div className="divider" />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleRestartSensor(sensor.id)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px' }}>
                  🔄 Ping / Reset
                </button>
                <button onClick={() => handleDeleteSensor(sensor.id)} className="btn-danger" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px' }}>
                  🗑 Remover
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Sensor Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card" style={{ width: 400, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>🔌 Registar Novo Sensor</h2>
            <form onSubmit={handleAddSensor} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nome do Sensor</label>
                <input required type="text" className="input-field" value={newSensorName} onChange={e => setNewSensorName(e.target.value)} placeholder="ex: Cozinha Principal" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Endereço MAC</label>
                <input type="text" className="input-field" value={newSensorMac} onChange={e => setNewSensorMac(e.target.value)} placeholder="00:11:22:33:44:55" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Localização (Site)</label>
                <select className="input-field" value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)}>
                  {sites.length === 0 ? (
                    <option value="site_demo_01">Casa Principal (Default)</option>
                  ) : (
                    sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                  )}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tipo de Operação</label>
                <select className="input-field" value={sensorType} onChange={e => setSensorType(e.target.value as any)}>
                  <option value="wifi_csi">Hardware Real (Wi-Fi CSI)</option>
                  <option value="simulated">Módulo Simulado (Software Demo)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1, padding: 8 }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: 8 }}>Registar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
