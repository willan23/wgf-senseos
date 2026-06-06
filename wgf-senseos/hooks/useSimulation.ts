'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  SimulationState,
  initialSimulationState, tickSimulation, SCENARIOS, SAMPLE_RATE_MS,
} from '@/lib/csi-simulator';
import { SimulationScenario } from '@/types';

const DEMO_SENSOR_ID = 'sensor_demo_01';
const DEMO_SITE_ID = 'site_demo_01';
const DEMO_ORG_ID = 'org_demo';

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
  const [state, setState] = useState<SimulationState>(initialSimulationState());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((scenario?: SimulationScenario) => {
    setState(prev => ({
      ...initialSimulationState(scenario || prev.scenario),
      isRunning: true,
    }));
  }, []);

  const stop = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const changeScenario = useCallback((scenario: SimulationScenario) => {
    setState(prev => ({
      ...initialSimulationState(scenario),
      isRunning: prev.isRunning,
    }));
  }, []);

  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        setState(prev => tickSimulation(prev, DEMO_SENSOR_ID, DEMO_SITE_ID, DEMO_ORG_ID));
      }, SAMPLE_RATE_MS);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning]);

  return { state, start, stop, changeScenario, SCENARIO_LABELS };
}
