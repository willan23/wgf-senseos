'use client';

import { useEffect, useRef, useState } from 'react';

interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: string;
  confidence: number;
}

interface Sensor {
  id: string;
  x: number;
  y: number;
  z: number;
  antennas: number;
}

interface FloorPlan3DProps {
  walls: Wall[];
  sensors: Sensor[];
  width?: number;
  height?: number;
  className?: string;
}

export default function FloorPlan3D({
  walls,
  sensors,
  width = 800,
  height = 600,
  className = '',
}: FloorPlan3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: -30, y: 45 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 20 * zoom;

    const cosX = Math.cos(rotation.x * Math.PI / 180);
    const sinX = Math.sin(rotation.x * Math.PI / 180);
    const cosY = Math.cos(rotation.y * Math.PI / 180);
    const sinY = Math.sin(rotation.y * Math.PI / 180);

    function project3D(x: number, y: number, z: number): [number, number] {
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      const perspective = 500 / (500 + z2);
      return [
        centerX + x1 * scale * perspective,
        centerY + y1 * scale * perspective,
      ];
    }

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 0.5;
    const gridSize = 10;
    for (let i = -gridSize; i <= gridSize; i++) {
      const [x1, y1] = project3D(i, 0, -gridSize);
      const [x2, y2] = project3D(i, 0, gridSize);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const [x3, y3] = project3D(-gridSize, 0, i);
      const [x4, y4] = project3D(gridSize, 0, i);
      ctx.beginPath();
      ctx.moveTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.stroke();
    }

    for (const wall of walls) {
      const wallHeight = 2.5;
      const thickness = 0.15;

      const [wx1, wy1] = project3D(wall.x1, 0, wall.y1);
      const [wx2, wy2] = project3D(wall.x2, 0, wall.y2);
      const [wx3, wy3] = project3D(wall.x1, wallHeight, wall.y1);
      const [wx4, wy4] = project3D(wall.x2, wallHeight, wall.y2);

      ctx.fillStyle = `rgba(0, 212, 255, ${0.3 + wall.confidence * 0.4})`;
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(wx1, wy1);
      ctx.lineTo(wx2, wy2);
      ctx.lineTo(wx4, wy4);
      ctx.lineTo(wx3, wy3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    for (const sensor of sensors) {
      const [sx, sy] = project3D(sensor.x, 0.1, sensor.y);
      const [sx2, sy2] = project3D(sensor.x, 0.1 + 0.3, sensor.y);

      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(sx, sy, 6 * zoom, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      ctx.fillStyle = '#00ff88';
      ctx.font = `${10 * zoom}px monospace`;
      ctx.fillText(sensor.id, sx + 10, sy - 5);
    }

  }, [walls, sensors, width, height, rotation, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;

    setRotation(prev => ({
      x: prev.x + dy * 0.5,
      y: prev.y + dx * 0.5,
    }));

    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  };

  return (
    <div className={`floor-plan-3d ${className}`} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          borderRadius: 8,
          border: '1px solid rgba(0, 212, 255, 0.2)',
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        display: 'flex',
        gap: 8,
        fontSize: 11,
        color: 'var(--text-secondary)',
      }}>
        <span>Arrastar: Rotacionar</span>
        <span>Scroll: Zoom</span>
        <span>Paredes: {walls.length}</span>
        <span>Sensores: {sensors.length}</span>
      </div>
    </div>
  );
}
