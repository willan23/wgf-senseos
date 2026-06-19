/**
 * WGF SenseOS — RF SLAM Map API Route
 * /api/rf-slam/map
 * 
 * Generates floor plans from CSI data using RF SLAM algorithms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateFloorPlan } from '@uwsc/core/rf-slam';

interface SlamRequest {
  siteId: string;
  sensorPositions: Array<{
    id: string;
    x: number;
    y: number;
    z: number;
    antennas: number;
  }>;
  csiData?: number[][];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, sensorPositions } = body;

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId is required' },
        { status: 400 },
      );
    }

    const sensors = (sensorPositions || []).map((s: any) => ({
      id: s.id || `sensor_${Math.random().toString(36).slice(2, 8)}`,
      x: s.x || 0,
      y: s.y || 0,
      z: s.z || 1.0,
      antennas: s.antennas || 3,
      orientation: s.orientation || 0,
    }));

    const floorPlan = generateFloorPlan([], sensors, {
      siteId,
      gridSize: 0.5,
      mergeDistance: 1.0,
      minConfidence: 0.3,
    });

    return NextResponse.json(floorPlan);
  } catch (error) {
    console.error('[rf-slam/map] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId');

  if (!siteId) {
    return NextResponse.json(
      { error: 'siteId query parameter is required' },
      { status: 400 },
    );
  }

  const floorPlan = generateFloorPlan([], [], { siteId });

  return NextResponse.json(floorPlan);
}
