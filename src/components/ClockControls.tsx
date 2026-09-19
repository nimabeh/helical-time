import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  ZoomIn, 
  Play, 
  Clock, 
  RotateCcw,
} from 'lucide-react';
import { ClockTime, CameraFocusMode, AppLanguage } from '../types';
import { SolarInfo } from '../utils/solarCalculator';
import { toFarsiDigits, formatFarsiNumber } from '../utils/farsiDigits';
import { translations } from '../utils/translations';

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
  solarInfo?: SolarInfo | null;
  language: AppLanguage;
  onToggleLanguage: () => void;
}

export const ClockControls: React.FC<ClockControlsProps> = ({
  clockTime,
  focusMode,
  onToggleFocus,
  isSimulating,
  simulationSpeed,
  onToggleSimulation,
  onChangeSpeed,
  solarInfo,
  language,
  onToggleLanguage,
}) => {
  const t = translations[language];
  const isFa = language === 'fa';

  // 1. Digital Clock visibility: collapsed to clock icon by default so torus is primary
  const [showTime, setShowTime] = useState<boolean>(false);

  // 2. Bottom-left View button 2-second auto-collapsing label
  const [showViewLabel, setShowViewLabel] = useState<boolean>(false);
  const viewTimerRef = useRef<number | null>(null);

  const triggerViewLabel = () => {
    setShowViewLabel(true);
    if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    viewTimerRef.current = window.setTimeout(() => {
      setShowViewLabel(false);
    }, 2200);
  };

  const handleViewClick = () => {
    onToggleFocus();
    triggerViewLabel();
  };

  // 3. Bottom-right Simulate button 2.5-second auto-collapsing label / controls
  const [showSimLabel, setShowSimLabel] = useState<boolean>(false);
  const simTimerRef = useRef<number | null>(null);

  const triggerSimLabel = () => {
    setShowSimLabel(true);
    if (simTimerRef.current) clearTimeout(simTimerRef.current);
    simTimerRef.current = window.setTimeout(() => {
      setShowSimLabel(false);
    }, 2800);
  };

  const handleSimToggle = () => {
    onToggleSimulation();
    triggerSimLabel();
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
      if (simTimerRef.current) clearTimeout(simTimerRef.current);
    };
  }, []);

  const formatDigits = (n: number) => n.toString().padStart(2, '0');

  // Hours under 10 show as single digit (e.g. 9 or ۹)
  const formattedHours = clockTime
    ? isFa ? formatFarsiNumber(clockTime.hours, 1) : clockTime.hours.toString()
    : '';
  const formattedMinutes = clockTime
    ? isFa ? formatFarsiNumber(clockTime.minutes, 2) : formatDigits(clockTime.minutes)
    : '';
  const formattedSeconds = clockTime
    ? isFa ? formatFarsiNumber(clockTime.seconds, 2) : formatDigits(clockTime.seconds)
    : '';

  return (
    <div 
      dir="ltr"
      className="pointer-events-none fixed inset-0 select-none overflow-hidden flex flex-col justify-between p-3 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] z-20"
    >
      {/* Top Header Row: Corners 1 & 2 (strictly fixed positions across languages) */}
      <header className="flex items-start justify-between w-full pointer-events-none gap-2">
        {/* Corner 1 (Top Left): Clock button toggles digital time readout */}
        {showTime && clockTime ? (
          <button
            id="clock-time-display"
            onClick={() => setShowTime(false)}
            title={solarInfo ? `${t.localTime} • ${solarInfo.cityName} (${t.clockTitleHide})` : t.clockTitleHide}
            className="pointer-events-auto touch-manipulation h-9 sm:h-10 px-3 sm:px-3.5 flex items-center justify-center gap-2 rounded-full backdrop-blur-md bg-slate-950/80 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:border-cyan-400/60 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div 
              dir="ltr"
              className="flex items-baseline gap-1 tracking-wider text-cyan-100" 
              style={{ 
                fontFamily: isFa ? '"Katibeh", cursive, monospace' : 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: isFa ? '19px' : '12px',
                lineHeight: 1,
              }}
            >
              <span className="font-semibold text-emerald-300">{formattedHours}</span>
              <span className="text-cyan-400/60">:</span>
              <span className="font-semibold text-cyan-200">{formattedMinutes}</span>
              <span className="text-cyan-400/60">:</span>
              <span className="text-cyan-300/80">{formattedSeconds}</span>
            </div>
          </button>
        ) : (
          <button
            id="clock-time-button"
            onClick={() => setShowTime(true)}
            title={t.clockTitleShow}
            className="pointer-events-auto touch-manipulation h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full backdrop-blur-md bg-slate-950/75 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.25)] text-cyan-300 hover:text-cyan-200 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <Clock className="w-4 h-4 text-cyan-300" />
          </button>
        )}

        {/* Corner 2 (Top Right): Language Switch Button (Text-only display, no icon) */}
        <button
          id="language-toggle-button"
          onClick={onToggleLanguage}
          title={t.toggleLangTitle}
          className="pointer-events-auto touch-manipulation h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full backdrop-blur-md bg-slate-950/75 border border-cyan-500/30 text-cyan-300 hover:text-cyan-100 hover:border-cyan-400/50 transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.15)] active:scale-95 cursor-pointer select-none"
        >
          <span 
            className="font-semibold tracking-wider"
            style={{ 
              fontFamily: isFa ? '"Katibeh", cursive, sans-serif' : 'system-ui, -apple-system, sans-serif',
              fontSize: isFa ? '17px' : '11px',
              lineHeight: 1,
            }}
          >
            {t.langCode}
          </span>
        </button>
      </header>

      {/* Bottom Footer Row: Corners 3 & 4 */}
      <footer className="w-full flex items-center justify-between pointer-events-none gap-2">
        {/* Corner 3 (Bottom Left): Perspective toggle (Hour View vs Second View) */}
        <button
          id="view-toggle-button"
          onClick={handleViewClick}
          onPointerEnter={triggerViewLabel}
          title={focusMode === 'node' ? t.hourViewTitle : t.secondViewTitle}
          className={`pointer-events-auto touch-manipulation h-9 sm:h-10 flex items-center justify-center rounded-full backdrop-blur-md border transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.15)] active:scale-95 cursor-pointer ${
            showViewLabel ? 'px-3 sm:px-3.5 gap-1.5' : 'w-9 sm:w-10 px-0'
          } ${
            focusMode === 'node'
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.25)]'
              : 'bg-slate-950/75 border-cyan-500/30 text-slate-200 hover:text-cyan-200 hover:border-cyan-500/50'
          }`}
        >
          {focusMode === 'node' ? (
            <>
              <Compass className="w-4 h-4 text-cyan-300 shrink-0" />
              {showViewLabel && (
                <span 
                  className="whitespace-nowrap animate-in fade-in duration-150 font-medium"
                  style={{
                    fontFamily: isFa ? '"Katibeh", cursive, sans-serif' : 'inherit',
                    fontSize: isFa ? '16px' : '11px',
                  }}
                >
                  {t.hourView}
                </span>
              )}
            </>
          ) : (
            <>
              <ZoomIn className="w-4 h-4 text-emerald-400 shrink-0" />
              {showViewLabel && (
                <span 
                  className="whitespace-nowrap animate-in fade-in duration-150 font-medium"
                  style={{
                    fontFamily: isFa ? '"Katibeh", cursive, sans-serif' : 'inherit',
                    fontSize: isFa ? '16px' : '11px',
                  }}
                >
                  {t.secondView}
                </span>
              )}
            </>
          )}
        </button>

        {/* Corner 4 (Bottom Right): Simulation & Live Time Controls */}
        {isSimulating ? (
          showSimLabel ? (
            <div 
              onPointerEnter={triggerSimLabel}
              className="pointer-events-auto touch-manipulation h-9 sm:h-10 px-2 flex items-center gap-1 rounded-full backdrop-blur-md bg-slate-950/80 border border-emerald-500/40 shadow-[0_0_15px_rgba(52,211,153,0.2)] animate-in fade-in duration-150"
            >
              <button
                onClick={handleSimToggle}
                className="h-7 sm:h-8 px-2 flex items-center gap-1 rounded-full font-medium text-emerald-200 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                title={t.returnLive}
              >
                <RotateCcw className="w-3 h-3 text-emerald-400 shrink-0" />
                <span
                  style={{
                    fontFamily: isFa ? '"Katibeh", cursive, sans-serif' : 'inherit',
                    fontSize: isFa ? '16px' : '11px',
                  }}
                >
                  {t.live}
                </span>
              </button>
              <div className="flex items-center gap-0.5 border-l border-emerald-500/30 pl-1">
                {[15, 60, 300].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => {
                      onChangeSpeed(spd);
                      triggerSimLabel();
                    }}
                    className={`h-6 sm:h-7 px-1.5 rounded-full transition-colors active:scale-95 cursor-pointer ${
                      simulationSpeed === spd
                        ? 'bg-emerald-400/25 text-emerald-200 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    style={{ 
                      fontFamily: isFa ? '"Katibeh", cursive, monospace' : 'ui-monospace, SFMono-Regular, monospace',
                      fontSize: isFa ? '15px' : '10px',
                    }}
                  >
                    {isFa ? toFarsiDigits(spd) : spd}{t.speedSuffix}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={triggerSimLabel}
              onPointerEnter={triggerSimLabel}
              title={t.simulateActive}
              className="pointer-events-auto touch-manipulation h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full backdrop-blur-md bg-slate-950/80 border border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.25)] text-emerald-300 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 ml-0.5 animate-pulse" />
            </button>
          )
        ) : (
          <button
            id="simulate-toggle-button"
            onClick={handleSimToggle}
            onPointerEnter={triggerSimLabel}
            title={t.simulateStart}
            className={`pointer-events-auto touch-manipulation h-9 sm:h-10 flex items-center justify-center rounded-full backdrop-blur-md bg-slate-950/75 border border-cyan-500/30 text-slate-200 hover:text-cyan-200 hover:border-cyan-500/50 transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.15)] active:scale-95 cursor-pointer ${
              showSimLabel ? 'px-3 sm:px-3.5 gap-1.5' : 'w-9 sm:w-10 px-0'
            }`}
          >
            <Play className="w-4 h-4 text-cyan-300 ml-0.5 shrink-0" />
            {showSimLabel && (
              <span 
                className="whitespace-nowrap animate-in fade-in duration-150 font-medium"
                style={{
                  fontFamily: isFa ? '"Katibeh", cursive, sans-serif' : 'inherit',
                  fontSize: isFa ? '16px' : '11px',
                }}
              >
                {t.simulate}
              </span>
            )}
          </button>
        )}
      </footer>
    </div>
  );
};

