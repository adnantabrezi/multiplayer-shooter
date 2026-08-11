import React, { useState, useEffect } from 'react';
import { Activity, Wifi, ArrowDown, ArrowUp, Zap } from 'lucide-react';
import { networkManager } from '../network/networkManager';

export const NetworkHUD: React.FC = () => {
  const [telemetry, setTelemetry] = useState({
    ping: networkManager.pingMs || 0,
    inKbs: networkManager.inKbs || 0,
    outKbs: networkManager.outKbs || 0,
    pps: networkManager.pps || 0
  });

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    networkManager.onTelemetryUpdated = (stats) => {
      setTelemetry(stats);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setIsExpanded(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getPingColor = (ping: number) => {
    if (ping <= 40) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60';
    if (ping <= 100) return 'text-amber-400 border-amber-500/40 bg-amber-950/60';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/60';
  };

  return (
    <div className="fixed top-4 right-4 z-50 font-mono text-xs select-none">
      {/* Compact Badge (Click or F3 to toggle detailed stats) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-lg transition hover:scale-105 ${getPingColor(telemetry.ping)}`}
        title="Press F3 to toggle network stats"
      >
        <Wifi className="w-3.5 h-3.5 animate-pulse" />
        <span className="font-bold">{telemetry.ping > 0 ? `${telemetry.ping}ms` : 'UDP OK'}</span>
        <span className="text-[10px] opacity-75 uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded">UDP</span>
      </button>

      {/* Expanded Telemetry HUD */}
      {isExpanded && (
        <div className="mt-2 w-64 bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl shadow-2xl text-slate-300 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-100 text-xs uppercase tracking-wider">
              <Activity className="w-4 h-4 text-emerald-400" /> WebRTC Telemetry
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">UDP ACTIVE</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
              <div className="text-slate-400 text-[10px] flex items-center gap-1">
                <ArrowDown className="w-3 h-3 text-cyan-400" /> INBOUND
              </div>
              <div className="font-bold text-slate-100 mt-0.5">{telemetry.inKbs} KB/s</div>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
              <div className="text-slate-400 text-[10px] flex items-center gap-1">
                <ArrowUp className="w-3 h-3 text-amber-400" /> OUTBOUND
              </div>
              <div className="font-bold text-slate-100 mt-0.5">{telemetry.outKbs} KB/s</div>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
              <div className="text-slate-400 text-[10px]">PACKET RATE</div>
              <div className="font-bold text-slate-100 mt-0.5">{telemetry.pps} PPS</div>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
              <div className="text-slate-400 text-[10px]">TICK RATE</div>
              <div className="font-bold text-slate-100 mt-0.5 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" /> 60Hz / 20Hz
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-center italic">
            Press F3 to toggle this telemetry panel
          </div>
        </div>
      )}
    </div>
  );
};
