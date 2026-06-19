import { NextRequest, NextResponse } from 'next/server';

declare global {
  var latestSystemState: any | undefined;
}

const getInitialState = () => ({
  isRunning: false,
  scenario: 'empty_house',
  t: 0,
  frames: [],
  detections: [],
  alerts: [],
  occupancy: 0,
  location: { x: 50, y: 50 },
  sensors: {},
});

export async function GET(req: NextRequest) {
  if (!globalThis.latestSystemState) {
    globalThis.latestSystemState = getInitialState();
  }

  // Convert sensors map to array for easier consumption in frontend
  const sensorList = Object.values(globalThis.latestSystemState.sensors || {});
  
  return NextResponse.json({
    ...globalThis.latestSystemState,
    sensorList,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { action, scenario } = await req.json();

    if (!globalThis.latestSystemState) {
      globalThis.latestSystemState = getInitialState();
    }

    if (action === 'start') {
      globalThis.latestSystemState.isRunning = true;
    } else if (action === 'stop') {
      globalThis.latestSystemState.isRunning = false;
      globalThis.latestSystemState.frames = [];
      globalThis.latestSystemState.detections = [];
      globalThis.latestSystemState.alerts = [];
      globalThis.latestSystemState.occupancy = 0;
    } else if (action === 'changeScenario' && scenario) {
      globalThis.latestSystemState.scenario = scenario;
      globalThis.latestSystemState.t = 0; // Reset time for new scenario sequence
      globalThis.latestSystemState.frames = [];
      globalThis.latestSystemState.detections = [];
      globalThis.latestSystemState.alerts = [];
    }

    const sensorList = Object.values(globalThis.latestSystemState.sensors || {});

    return NextResponse.json({
      ...globalThis.latestSystemState,
      sensorList,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update state' }, { status: 500 });
  }
}
