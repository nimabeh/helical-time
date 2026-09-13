import * as THREE from 'three';
import { ClockTime } from '../types';

export const MAJOR_RADIUS = 14.0;
export const MINOR_RADIUS = 2.6;
export const MICRO_RADIUS = 0.38; // Radius of second/minute micro-coil
export const TOTAL_HOURS = 24;
export const MINUTES_PER_HOUR = 60;
export const TOTAL_MINUTES = TOTAL_HOURS * MINUTES_PER_HOUR; // 1440

/**
 * Parametric Helical Torus Curve (24 full loops representing 24 hours)
 */
export class HelicalTorusCurve extends THREE.Curve<THREE.Vector3> {
  public majorRadius: number;
  public minorRadius: number;
  public loops: number;

  constructor(majorRadius = MAJOR_RADIUS, minorRadius = MINOR_RADIUS, loops = TOTAL_HOURS) {
    super();
    this.majorRadius = majorRadius;
    this.minorRadius = minorRadius;
    this.loops = loops;
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    // t is from 0.0 to 1.0 (24 hours full cycle)
    // Vertically flipped so 12 (noon, t=0.5) is at top, 6 (06:00, t=0.25) is at right, 0 (midnight, t=0) is at bottom
    const phi = Math.PI * 0.5 - 2.0 * Math.PI * t;
    const psi = this.loops * 2.0 * Math.PI * t;

    const rComp = this.majorRadius + this.minorRadius * Math.cos(psi);
    const x = rComp * Math.cos(phi);
    const y = -rComp * Math.sin(phi); // Flipped to top: 12 is top, 6 is right, 0 is bottom
    const z = this.minorRadius * Math.sin(psi);

    return optionalTarget.set(x, y, z);
  }
}

/**
 * Global hour curve instance
 */
export const clockCurve = new HelicalTorusCurve(MAJOR_RADIUS, MINOR_RADIUS, TOTAL_HOURS);

/**
 * Precise 3D position including the micro-spiral for seconds & minutes
 * This forms the continuous fractal path where:
 * - 1 full macro circle = 24 hours (day)
 * - 24 loops = 24 hours (1 loop per hour)
 * - 60 micro-loops per hour = 60 minutes (1 micro-loop per minute)
 * - Traversal around 1 micro-loop = 60 seconds!
 */
export function getNestedClockPoint(
  t: number,
  includeMicro = true,
  target = new THREE.Vector3()
): THREE.Vector3 {
  const wrappedT = ((t % 1.0) + 1.0) % 1.0;

  // Macro angle (day progress)
  const phi = Math.PI * 0.5 - 2.0 * Math.PI * wrappedT;
  // Hour coil angle (24 turns per day)
  const psi = TOTAL_HOURS * 2.0 * Math.PI * wrappedT;

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosPsi = Math.cos(psi);
  const sinPsi = Math.sin(psi);

  // Hour tube center line (vertically flipped so 12 is on top representing noon)
  const rComp = MAJOR_RADIUS + MINOR_RADIUS * cosPsi;
  const cx = rComp * cosPhi;
  const cy = -rComp * sinPhi;
  const cz = MINOR_RADIUS * sinPsi;

  if (!includeMicro) {
    return target.set(cx, cy, cz);
  }

  // Micro-spiral angle: 60 coils per hour = 1440 coils per day
  // Each full 360 degree rotation of theta is 1 minute (60 seconds)
  const theta = TOTAL_MINUTES * 2.0 * Math.PI * wrappedT;

  // Local orthonormal frame in tube cross-section:
  const nx = cosPsi * cosPhi;
  const ny = -cosPsi * sinPhi;
  const nz = sinPsi;

  const bx = -sinPhi;
  const by = -cosPhi;
  const bz = 0;

  const mx = cx + MICRO_RADIUS * (Math.cos(theta) * nx + Math.sin(theta) * bx);
  const my = cy + MICRO_RADIUS * (Math.cos(theta) * ny + Math.sin(theta) * by);
  const mz = cz + MICRO_RADIUS * (Math.cos(theta) * nz + Math.sin(theta) * bz);

  return target.set(mx, my, mz);
}

/**
 * Calculates current time metrics from a Date or synthetic simulated timestamp
 */
export function calculateClockTime(date: Date = new Date()): ClockTime {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();

  // Normalized progress throughout the full 24-hour day (0.0 to 1.0)
  const totalSecondsInDay = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  const dayFraction = totalSecondsInDay / 86400;

  // Normalized progress within current hour (0.0 to 1.0)
  const totalSecondsInHour = minutes * 60 + seconds + milliseconds / 1000;
  const hourProgress = totalSecondsInHour / 3600;

  return {
    hours,
    minutes,
    seconds,
    milliseconds,
    dayFraction,
    hourProgress,
  };
}

/**
 * Get 3D position on the clock spring for a given day fraction [0, 1]
 */
export function getPositionAtTimeFraction(
  t: number,
  includeMicro = true,
  target = new THREE.Vector3()
): THREE.Vector3 {
  return getNestedClockPoint(t, includeMicro, target);
}

/**
 * Get tangent vector at given time fraction
 */
export function getTangentAtTimeFraction(t: number, target = new THREE.Vector3()): THREE.Vector3 {
  const dt = 0.00001;
  const p1 = getNestedClockPoint(t - dt, false);
  const p2 = getNestedClockPoint(t + dt, false);
  return target.subVectors(p2, p1).normalize();
}
