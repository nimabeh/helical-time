/**
 * Types for the Aurora Helical 3D Clock
 */

export interface ClockTime {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  dayFraction: number; // 0.0 to 1.0 (24-hour normalized progress)
  hourProgress: number; // 0.0 to 1.0 (progress within current 1-hour loop)
}

export type CameraFocusMode = 'free' | 'ring' | 'node';

export interface ClockSettings {
  focusMode: CameraFocusMode;
  realtime: boolean;
  timeScale: number; // For interactive time exploration / scrub
  showConstellationDust: boolean;
  soundEnabled: boolean;
}
