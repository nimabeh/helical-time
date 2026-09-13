import React from 'react';
import { 
  Compass, 
  ZoomIn, 
  Play, 
  Sun,
  Moon,
  SunMoon,
} from 'lucide-react';
import { ClockTime, CameraFocusMode } from '../types';
import { SolarInfo } from '../utils/solarCalculator';

interface ClockControlsProps {
  clockTime: ClockTime | null;
  focusMode: CameraFocusMode;
  onSetFocusMode: (mode: CameraFocusMode) => void;
  onToggleFocus: () => void;
  onResetView: () => void;
  isSimulating: boolean;
  simulationSpeed: number;
  onToggleSimulation: () => void;
  onChangeSpeed: (speed: number) => void;
  warmthMode: 'auto' | 'day' | 'night';
  onCycleWarmth: () => void;
  solarInfo?: SolarInfo | null;
}

export const ClockControls: React.FC<ClockControlsProps> = ({
  clockTime,
  focusMode,
  onToggleFocus,
  isSimulating,
  simulationSpeed,
  onToggleSimulation,
  onChangeSpeed,
  warmthMode,
  onCycleWarmth,
  solarInfo,
}) => {
  const formatDigits = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden flex flex-col justify-between p-4 md:p-6 z-10">
      {/* Top Header Row: Corners 1 & 2 */}
      <header className="flex items-start justify-between w-full">
        {/* Corner 1 (Top Left): Live Celestial Readout */}
        <div 
          id="clock-time-display"
          title={solarInfo ? `Local Time • ${solarInfo.cityName} (Sunrise: ${solarInfo.sunriseFormatted} | Sunset: ${solarInfo.sunsetFormatted})` : 'Live Local Time'}
          className="pointer-events-auto h-9 px-3.5 flex items-center justify-center gap-2.5 rounded-full backdrop-blur-md bg-slate-950/60 border border-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.1)] cursor-default"
        >
          <div className="relative flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          </div>
          {clockTime && (
            <div className="flex items-baseline gap-1 font-mono text-xs tracking-wider text-cyan-100">
              <span className="font-semibold text-emerald-300">{formatDigits(clockTime.hours)}</span>
              <span className="text-cyan-400/60">:</span>
              <span className="font-semibold text-cyan-200">{formatDigits(clockTime.minutes)}</span>
              <span className="text-cyan-400/60">:</span>
              <span className="text-cyan-300/80">{formatDigits(clockTime.seconds)}</span>
            </div>
          )}
        </div>

        {/* Corner 2 (Top Right): Atmosphere Tone Switcher */}
        <button
          id="tone-mode-button"
          onClick={onCycleWarmth}
          title={`Tone: ${warmthMode.toUpperCase()} (Click to toggle)`}
          className={`pointer-events-auto h-9 px-3.5 flex items-center justify-center gap-1.5 rounded-full backdrop-blur-md border text-xs font-medium transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.1)] ${
            warmthMode === 'day'
              ? 'bg-amber-500/20 border-amber-400/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
              : warmthMode === 'night'
              ? 'bg-indigo-500/20 border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              : 'bg-slate-950/60 border-cyan-500/25 text-slate-200 hover:text-cyan-200 hover:border-cyan-500/40'
          }`}
        >
          {warmthMode === 'day' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span>Day Tone</span>
            </>
          ) : warmthMode === 'night' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-cyan-300" />
              <span>Night Tone</span>
            </>
          ) : (
            <>
              <SunMoon className="w-3.5 h-3.5 text-emerald-300" />
              <span>Auto Tone</span>
            </>
          )}
        </button>
      </header>

      {/* Bottom Footer Row: Corners 3 & 4 */}
      <footer className="w-full flex items-center justify-between">
        {/* Corner 3 (Bottom Left): Single Button for Seconds View / Torus View */}
        <button
          id="view-toggle-button"
          onClick={onToggleFocus}
          title={focusMode === 'node' ? 'Reset to Torus View' : 'Zoom into Micro Spiral (Seconds View)'}
          className={`pointer-events-auto h-9 px-3.5 flex items-center justify-center gap-1.5 rounded-full backdrop-blur-md border text-xs font-medium transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.1)] ${
            focusMode === 'node'
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.25)]'
              : 'bg-slate-950/60 border-cyan-500/25 text-slate-200 hover:text-cyan-200 hover:border-cyan-500/40'
          }`}
        >
          {focusMode === 'node' ? (
            <>
              <Compass className="w-3.5 h-3.5 text-cyan-300" />
              <span>Torus View</span>
            </>
          ) : (
            <>
              <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Seconds View</span>
            </>
          )}
        </button>

        {/* Corner 4 (Bottom Right): Simulation & Live Time Controls */}
        {isSimulating ? (
          <div className="pointer-events-auto h-9 px-2 flex items-center gap-1 rounded-full backdrop-blur-md bg-slate-950/60 border border-emerald-500/40 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
            <button
              onClick={onToggleSimulation}
              className="h-7 px-2 flex items-center gap-1.5 rounded-full text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 transition-colors"
              title="Return to Live Time"
            >
              <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
              <span>Live</span>
            </button>
            <div className="flex items-center gap-0.5 border-l border-emerald-500/30 pl-1">
              {[15, 60, 300].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onChangeSpeed(spd)}
                  className={`h-6 px-1.5 rounded-full text-[10px] font-mono transition-colors ${
                    simulationSpeed === spd
                      ? 'bg-emerald-400/25 text-emerald-200 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            id="simulate-toggle-button"
            onClick={onToggleSimulation}
            title="Start Fast-Forward Simulation"
            className="pointer-events-auto h-9 px-3.5 flex items-center justify-center gap-1.5 rounded-full backdrop-blur-md bg-slate-950/60 border border-cyan-500/25 text-xs font-medium text-slate-200 hover:text-cyan-200 hover:border-cyan-500/40 transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
          >
            <Play className="w-3.5 h-3.5 text-cyan-300" />
            <span>Simulate</span>
          </button>
        )}
      </footer>
    </div>
  );
};

