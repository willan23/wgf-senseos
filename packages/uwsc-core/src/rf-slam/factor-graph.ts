/**
 * WGF SenseOS — Factor Graph Optimization Solver
 * Implements a non-linear least squares solver (Levenberg-Marquardt)
 * for spatial wall alignment and sensor constraint optimization.
 */

export interface WallState {
  id: string;
  x: number;      // Center X
  y: number;      // Center Y
  theta: number;  // Orientation angle in radians
  length: number;
}

export type FactorType = 'prior' | 'junction' | 'range';

export interface PriorFactor {
  type: 'prior';
  varId: string;
  x: number;
  y: number;
  theta: number;
  weight: number;
}

export interface JunctionFactor {
  type: 'junction';
  varId1: string;
  varId2: string;
  junctionType: 'perpendicular' | 'parallel';
  weight: number;
}

export interface RangeFactor {
  type: 'range';
  varId: string;
  sensorX: number;
  sensorY: number;
  distance: number; // Constrained distance to wall line
  weight: number;
}

export type Factor = PriorFactor | JunctionFactor | RangeFactor;

export class FactorGraph {
  private variables: Map<string, WallState> = new Map();
  private factors: Factor[] = [];

  constructor() {}

  /**
   * Adds a wall node to the factor graph.
   */
  addVariable(id: string, initial: WallState): void {
    this.variables.set(id, { ...initial });
  }

  /**
   * Adds a Prior Factor to keep a wall close to its measured coordinates.
   */
  addPriorFactor(varId: string, x: number, y: number, theta: number, weight = 1.0): void {
    this.factors.push({
      type: 'prior',
      varId,
      x,
      y,
      theta,
      weight,
    });
  }

  /**
   * Adds a Junction Factor to align two nearby walls (either 90 deg or 0/180 deg).
   */
  addJunctionFactor(varId1: string, varId2: string, junctionType: 'perpendicular' | 'parallel', weight = 1.0): void {
    this.factors.push({
      type: 'junction',
      varId1,
      varId2,
      junctionType,
      weight,
    });
  }

  /**
   * Adds a Range Factor constraining the distance from a sensor to the wall line.
   */
  addRangeFactor(varId: string, sensorX: number, sensorY: number, distance: number, weight = 1.0): void {
    this.factors.push({
      type: 'range',
      varId,
      sensorX,
      sensorY,
      distance,
      weight,
    });
  }

  /**
   * Normalizes an angle to [-PI, PI] range.
   */
  private normalizeAngle(angle: number): number {
    let a = angle % (2 * Math.PI);
    if (a > Math.PI) a -= 2 * Math.PI;
    if (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  /**
   * Solves a linear system A * x = b using Gauss-Jordan elimination with partial pivoting.
   */
  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = b.length;
    const M: number[][] = [];

    // Augment matrix
    for (let i = 0; i < n; i++) {
      M.push([...A[i], b[i]]);
    }

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxEl = Math.abs(M[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxEl) {
          maxEl = Math.abs(M[k][i]);
          maxRow = k;
        }
      }

      // Swap rows
      if (maxRow !== i) {
        const temp = M[i];
        M[i] = M[maxRow];
        M[maxRow] = temp;
      }

      // If pivot is zero, matrix is singular (add small diagonal component)
      if (Math.abs(M[i][i]) < 1e-12) {
        M[i][i] = 1e-12;
      }

      // Eliminate columns
      for (let k = i + 1; k < n; k++) {
        const c = -M[k][i] / M[i][i];
        for (let j = i; j <= n; j++) {
          if (i === j) {
            M[k][j] = 0;
          } else {
            M[k][j] += c * M[i][j];
          }
        }
      }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n] / M[i][i];
      for (let k = i - 1; k >= 0; k--) {
        M[k][n] -= M[k][i] * x[i];
      }
    }

    return x;
  }

  /**
   * Computes the error vector for all factors.
   */
  private computeErrors(states: Map<string, WallState>): number[] {
    const errors: number[] = [];

    for (const f of this.factors) {
      if (f.type === 'prior') {
        const s = states.get(f.varId);
        if (s) {
          errors.push((s.x - f.x) * f.weight);
          errors.push((s.y - f.y) * f.weight);
          errors.push(this.normalizeAngle(s.theta - f.theta) * f.weight);
        }
      } else if (f.type === 'junction') {
        const s1 = states.get(f.varId1);
        const s2 = states.get(f.varId2);
        if (s1 && s2) {
          const thetaDiff = s1.theta - s2.theta;
          if (f.junctionType === 'perpendicular') {
            // Perpendicular constraint: cos(theta_i - theta_j) = 0
            errors.push(Math.cos(thetaDiff) * f.weight);
          } else {
            // Parallel constraint: sin(theta_i - theta_j) = 0
            errors.push(Math.sin(thetaDiff) * f.weight);
          }
        }
      } else if (f.type === 'range') {
        const s = states.get(f.varId);
        if (s) {
          // Shortest distance from sensor to the wall line
          // Equation of wall line: (x - center.x)*sin(theta) - (y - center.y)*cos(theta) = 0
          const dist = Math.abs((f.sensorX - s.x) * Math.sin(s.theta) - (f.sensorY - s.y) * Math.cos(s.theta));
          errors.push((dist - f.distance) * f.weight);
        }
      }
    }

    return errors;
  }

  /**
   * Optimizes the Factor Graph using Levenberg-Marquardt non-linear least squares.
   */
  optimize(maxIterations = 20): Map<string, WallState> {
    const varList = Array.from(this.variables.keys());
    const N = varList.length;
    if (N === 0 || this.factors.length === 0) return this.variables;

    let lambda = 0.01;
    let bestStates = new Map<string, WallState>();
    for (const [k, v] of this.variables) {
      bestStates.set(k, { ...v });
    }

    let currentErrors = this.computeErrors(bestStates);
    let currentCost = currentErrors.reduce((sum, e) => sum + e * e, 0);

    for (let iter = 0; iter < maxIterations; iter++) {
      const M = currentErrors.length;
      const numParams = N * 3; // 3 parameters per wall: x, y, theta

      // 1. Build Jacobian matrix J (size M x numParams) numerically
      const J: number[][] = Array.from({ length: M }, () => new Array(numParams).fill(0));
      const delta = 1e-6;

      for (let j = 0; j < N; j++) {
        const varId = varList[j];

        for (let paramIdx = 0; paramIdx < 3; paramIdx++) {
          // Perturb variable
          const tempStates = new Map<string, WallState>();
          for (const [k, v] of bestStates) {
            tempStates.set(k, { ...v });
          }

          const s = tempStates.get(varId)!;
          if (paramIdx === 0) s.x += delta;
          else if (paramIdx === 1) s.y += delta;
          else s.theta = this.normalizeAngle(s.theta + delta);

          const perturbedErrors = this.computeErrors(tempStates);
          const colIdx = j * 3 + paramIdx;

          for (let i = 0; i < M; i++) {
            J[i][colIdx] = (perturbedErrors[i] - currentErrors[i]) / delta;
          }
        }
      }

      // 2. Compute H = J^T * J (size numParams x numParams) and g = -J^T * error
      const H: number[][] = Array.from({ length: numParams }, () => new Array(numParams).fill(0));
      const g = new Array(numParams).fill(0);

      for (let col = 0; col < numParams; col++) {
        for (let row = 0; row < numParams; row++) {
          let sum = 0;
          for (let i = 0; i < M; i++) {
            sum += J[i][col] * J[i][row];
          }
          H[col][row] = sum;
        }

        let sumG = 0;
        for (let i = 0; i < M; i++) {
          sumG += J[i][col] * currentErrors[i];
        }
        g[col] = -sumG;
      }

      // 3. Solve Levenberg-Marquardt step: (H + lambda * I) * step = g
      const H_lm: number[][] = H.map(r => [...r]);
      for (let i = 0; i < numParams; i++) {
        H_lm[i][i] += lambda;
      }

      let step: number[];
      try {
        step = this.solveLinearSystem(H_lm, g);
      } catch (err) {
        // Singular matrix, increase lambda and continue
        lambda *= 10;
        continue;
      }

      // 4. Check step norm
      const stepNorm = Math.sqrt(step.reduce((sum, s) => sum + s * s, 0));
      if (stepNorm < 1e-6) {
        break; // Converged
      }

      // 5. Apply step to create candidate states
      const candidateStates = new Map<string, WallState>();
      for (let j = 0; j < N; j++) {
        const varId = varList[j];
        const original = bestStates.get(varId)!;
        candidateStates.set(varId, {
          id: varId,
          x: original.x + step[j * 3 + 0],
          y: original.y + step[j * 3 + 1],
          theta: this.normalizeAngle(original.theta + step[j * 3 + 2]),
          length: original.length,
        });
      }

      const candidateErrors = this.computeErrors(candidateStates);
      const candidateCost = candidateErrors.reduce((sum, e) => sum + e * e, 0);

      // 6. Accept or reject step
      if (candidateCost < currentCost) {
        // Accept
        bestStates = candidateStates;
        currentErrors = candidateErrors;
        currentCost = candidateCost;
        lambda /= 10; // Decrease damping factor
      } else {
        // Reject
        lambda *= 10; // Increase damping factor
      }
    }

    // Apply optimized values to variables mapping
    for (const [k, v] of bestStates) {
      this.variables.set(k, v);
    }

    return this.variables;
  }
}
