'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationState, initialSimulationState } from '@/lib/csi-simulator';
import { SimulationScenario } from '@/types';

const SCENARIO_LABELS: Record<SimulationScenario, string> = {
  empty_house: '🏠 Casa Vazia',
  one_person_enters: '🚶 Pessoa Entra',
  two_people_walking: '👥 Dois a Caminhar',
  person_breathing: '💨 Pessoa Estática',
  fall_event: '🫸 Queda Detetada',
  unknown_intruder: '🚨 Intruso Desconhecido',
  store_customer_flow: '🛍️ Loja — Fluxo de Clientes',
};

export function useSimulation() {
  const [state, setState] = useState<SimulationState & { sensors?: Record<string, any>; sensorList?: any[] }>({
    ...initialSimulationState(),
    sensors: {},
    sensorList: [],
  });

  const pollState = useCallback(async () => {
    try {
      const res = await fetch('/api/uwsc/state');
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({
          ...prev,
          isRunning: data.isRunning,
          scenario: data.scenario,
          t: data.t ?? prev.t,
          frames: data.frames || [],
          detections: data.detections || [],
          alerts: data.alerts || [],
          occupancy: data.occupancy || 0,
          location: data.location || { x: 50, y: 50 },
          sensors: data.sensors || {},
          sensorList: data.sensorList || [],
        }));
      }
    } catch (err) {
      console.error('Error polling simulation state:', err);
    }
  }, []);

  const start = useCallback(async (scenario?: SimulationScenario) => {
    try {
      const res = await fetch('/api/uwsc/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({
          ...prev,
          isRunning: true,
          scenario: data.scenario,
        }));
      }
    } catch (err) {
      console.error('Error starting simulation:', err);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      const res = await fetch('/api/uwsc/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      if (res.ok) {
        setState(prev => ({
          ...prev,
          isRunning: false,
          frames: [],
          detections: [],
          alerts: [],
          occupancy: 0,
        }));
      }
    } catch (err) {
      console.error('Error stopping simulation:', err);
    }
  }, []);

  const changeScenario = useCallback(async (scenario: SimulationScenario) => {
    try {
      const res = await fetch('/api/uwsc/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changeScenario', scenario }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({
          ...prev,
          scenario: data.scenario,
          frames: [],
          detections: [],
          alerts: [],
          occupancy: 0,
        }));
      }
    } catch (err) {
      console.error('Error changing scenario:', err);
    }
  }, []);

  useEffect(() => {
    // Poll immediately
    pollState();
    
    // Poll every 500ms
    const interval = setInterval(pollState, 500);
    
    return () => clearInterval(interval);
  }, [pollState]);

  return { state, start, stop, changeScenario, SCENARIO_LABELS };
}
