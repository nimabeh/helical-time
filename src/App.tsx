/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AuroraClockEngine } from './components/AuroraClockEngine';
import { ClockControls } from './components/ClockControls';
import { ClockTime, CameraFocusMode } from './types';
import { getLocalSolarInfo, SolarInfo } from './utils/solarCalculator';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<AuroraClockEngine | null>(null);

  const [clockTime, setClockTime] = useState<ClockTime | null>(null);
  const [focusMode, setFocusMode] = useState<CameraFocusMode>('free');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(60);
  const [warmthMode, setWarmthMode] = useState<'auto' | 'day' | 'night'>('auto');
  const [solarInfo, setSolarInfo] = useState<SolarInfo | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new AuroraClockEngine(containerRef.current, {
      onTimeUpdate: (time) => {
        setClockTime(time);
      },
      onFocusChange: (mode) => {
        setFocusMode(mode);
      },
    });

    engineRef.current = engine;

    // Fetch local user astronomical solar data (sunrise & sunset)
    getLocalSolarInfo().then((info) => {
      setSolarInfo(info);
      if (engineRef.current) {
        engineRef.current.setSolarInfo(info);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      engine.onResize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSetFocusMode = (mode: CameraFocusMode) => {
    if (!engineRef.current) return;
    engineRef.current.setFocusMode(mode);
    setFocusMode(mode);
  };

  const handleToggleFocus = () => {
    if (!engineRef.current) return;
    const nextMode = engineRef.current.toggleFocus();
    setFocusMode(nextMode);
  };

  const handleResetView = () => {
    if (!engineRef.current) return;
    engineRef.current.setFocusMode('ring');
    setFocusMode('ring');
  };

  const handleToggleSimulation = () => {
    if (!engineRef.current) return;
    if (isSimulating) {
      engineRef.current.resetToRealtime();
      setIsSimulating(false);
    } else {
      engineRef.current.isSimulating = true;
      engineRef.current.simulationSpeed = simulationSpeed;
      setIsSimulating(true);
    }
  };

  const handleChangeSpeed = (speed: number) => {
    if (!engineRef.current) return;
    setSimulationSpeed(speed);
    engineRef.current.simulationSpeed = speed;
  };

  const handleCycleWarmth = () => {
    if (!engineRef.current) return;
    const modes: ('auto' | 'day' | 'night')[] = ['auto', 'day', 'night'];
    const nextIdx = (modes.indexOf(warmthMode) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    setWarmthMode(nextMode);
    engineRef.current.setWarmthMode(nextMode);
  };

  return (
    <main className="fixed inset-0 w-full h-[100dvh] overflow-hidden bg-slate-950 select-none touch-none">
      {/* Three.js 3D WebGL Canvas Container */}
      <div
        id="aurora-clock-canvas-container"
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Minimal Unobtrusive UI Controls */}
      <ClockControls
        clockTime={clockTime}
        focusMode={focusMode}
        onSetFocusMode={handleSetFocusMode}
        onToggleFocus={handleToggleFocus}
        onResetView={handleResetView}
        isSimulating={isSimulating}
        simulationSpeed={simulationSpeed}
        onToggleSimulation={handleToggleSimulation}
        onChangeSpeed={handleChangeSpeed}
        warmthMode={warmthMode}
        onCycleWarmth={handleCycleWarmth}
        solarInfo={solarInfo}
      />
    </main>
  );
}
