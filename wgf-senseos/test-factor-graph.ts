// ============================================================
// Factor Graph Optimization Validation Script
// ============================================================

import { FactorGraph } from '../packages/uwsc-core/src/rf-slam/factor-graph';
import { optimizeWallsWithFactorGraph } from '../packages/uwsc-core/src/rf-slam/floor-plan-generator';
import type { Wall, SensorPosition } from '../packages/uwsc-core/src/rf-slam/types';

function runTests() {
  console.log('--- TEST START: Factor Graph Solver ---');

  try {
    // ------------------------------------------------------------
    // Test 1: Prior Factor Convergence
    // ------------------------------------------------------------
    console.log('\n[Test 1] Testing Prior Factor convergence...');
    const graph = new FactorGraph();
    
    // Initial noisy guess
    graph.addVariable('wall_1', {
      id: 'wall_1',
      x: 2.2,
      y: 1.8,
      theta: 0.1, // ~5.7 degrees
      length: 4.0,
    });
    
    // Prior factor: wall should be at (2.0, 2.0, 0.0)
    graph.addPriorFactor('wall_1', 2.0, 2.0, 0.0, 1.0);
    
    const results1 = graph.optimize(15);
    const w1 = results1.get('wall_1')!;
    
    console.log(`Initial: (2.2, 1.8, 0.1) -> Optimized: (${w1.x.toFixed(4)}, ${w1.y.toFixed(4)}, ${w1.theta.toFixed(4)})`);
    
    if (Math.abs(w1.x - 2.0) > 1e-4) throw new Error('Prior factor X optimization failed');
    if (Math.abs(w1.y - 2.0) > 1e-4) throw new Error('Prior factor Y optimization failed');
    if (Math.abs(w1.theta - 0.0) > 1e-4) throw new Error('Prior factor Theta optimization failed');
    console.log('Prior Factor convergence: PASSED ✅');

    // ------------------------------------------------------------
    // Test 2: Junction Orthogonality (Perpendicular) Constraint
    // ------------------------------------------------------------
    console.log('\n[Test 2] Testing Junction Orthogonality (Perpendicular) alignment...');
    
    // Create two walls that are nearly perpendicular (83 degrees instead of 90 degrees)
    // Wall 1: horizontal (theta = 0)
    // Wall 2: nearly vertical (theta = 83 degrees = 1.4486 rad)
    const walls: Wall[] = [
      {
        id: 'wall_horizontal',
        x1: 0, y1: 0,
        x2: 10, y2: 0, // theta = 0
        type: 'solid',
        confidence: 0.8,
      },
      {
        id: 'wall_nearly_vertical',
        x1: 5, y1: 0,
        x2: 5.6, y2: 5, // theta = atan2(5, 0.6) = 1.451 rad = 83.1 degrees
        type: 'solid',
        confidence: 0.8,
      }
    ];

    const sensors: SensorPosition[] = [];
    
    const optimizedWalls = optimizeWallsWithFactorGraph(walls, sensors);
    
    const wHoriz = optimizedWalls.find(w => w.id === 'wall_horizontal')!;
    const wVert = optimizedWalls.find(w => w.id === 'wall_nearly_vertical')!;
    
    const thetaHoriz = Math.atan2(wHoriz.y2 - wHoriz.y1, wHoriz.x2 - wHoriz.x1);
    const thetaVert = Math.atan2(wVert.y2 - wVert.y1, wVert.x2 - wVert.x1);
    
    const angleDiffRad = Math.abs(thetaVert - thetaHoriz);
    const angleDiffDeg = (angleDiffRad * 180) / Math.PI;
    
    console.log(`Initial angle diff: 83.1° -> Optimized angle diff: ${angleDiffDeg.toFixed(2)}°`);
    
    // Perpendicular constraint should pull it closer to 90 degrees, balancing prior and junction factors
    if (Math.abs(angleDiffDeg - 90) > 3.0) throw new Error('Junction Orthogonality optimization failed');
    console.log('Junction Orthogonality (90°): PASSED ✅');

    // ------------------------------------------------------------
    // Test 3: Range constraint (Sensor Distance)
    // ------------------------------------------------------------
    console.log('\n[Test 3] Testing Range (Distance to Sensor) constraints...');
    const graphRange = new FactorGraph();
    
    // Wall center initial guess: (3.5, 0.0, 90 deg)
    graphRange.addVariable('wall_range', {
      id: 'wall_range',
      x: 3.5,
      y: 0.0,
      theta: Math.PI / 2, // exactly vertical
      length: 10.0,
    });
    
    // Prior factor keeping it at (3.5, 0.0, 90 deg) with a lower weight
    graphRange.addPriorFactor('wall_range', 3.5, 0.0, Math.PI / 2, 0.2);
    
    // Sensor at (0, 0). Range factor says wall line must be exactly 3.0 meters away from sensor
    graphRange.addRangeFactor('wall_range', 0.0, 0.0, 3.0, 2.0);
    
    const resultsRange = graphRange.optimize(20);
    const wRange = resultsRange.get('wall_range')!;
    
    // Shortest distance from sensor (0,0) to line is x * sin(theta) - y * cos(theta)
    // For theta = pi/2, distance is x.
    console.log(`Initial center X: 3.5 -> Optimized center X: ${wRange.x.toFixed(4)} (should converge close to 3.0)`);
    
    if (Math.abs(wRange.x - 3.0) > 0.15) throw new Error('Range constraint optimization failed');
    console.log('Range constraint (Sensor Distance): PASSED ✅');

    console.log('\nAll Factor Graph Solver assertions PASSED! 📈🎯✅');
  } catch (err) {
    console.error('\nTest failed ❌', err);
    process.exit(1);
  }
}

runTests();
