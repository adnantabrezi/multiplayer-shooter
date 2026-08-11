import React from 'react';
import { Play, Volume2, Settings, Skull, LogOut } from 'lucide-react';
import { GameSettings } from '../types';

interface Props {
  onResume: () => void;
  onSuicide: () => void;
  onExit: () => void;
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
}

export const PauseOverlay: React.FC<Props> = ({
  onResume,
  onSuicide,
  onExit,
  settings,
  onSettingsChange
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-black/80 border-2 border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6 text-white font-sans">
        
        <div className="text-center">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-yellow-400 bg-black/60 px-3 py-1 rounded-full border border-yellow-500/40">
            PAUSE MENU
          </span>
          <h2 className="text-2xl font-black text-white mt-2 italic tracking-wider">TACTICAL PAUSE</h2>
        </div>

        {/* Settings Sliders & Toggles */}
        <div className="space-y-4 bg-black/40 p-4 rounded-xl border border-white/10 text-xs">
          <div>
            <div className="flex justify-between font-bold text-gray-200 mb-1 tracking-wider">
              <span>AUDIO VOLUME</span>
              <span className="text-yellow-400 font-mono">{Math.round(settings.soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.soundVolume}
              onChange={(e) => onSettingsChange({ ...settings, soundVolume: parseFloat(e.target.value) })}
              className="w-full accent-red-600 h-2 bg-gray-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="font-bold text-gray-200 tracking-wider">ON-SCREEN TOUCH JOYSTICKS</span>
            <input
              type="checkbox"
              checked={settings.showTouchControls}
              onChange={(e) => onSettingsChange({ ...settings, showTouchControls: e.target.checked })}
              className="w-5 h-5 accent-red-600 rounded cursor-pointer"
            />
          </div>

          {settings.showTouchControls && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div>
                <span className="font-bold text-yellow-400 block mb-1">JOYSTICK SIZE</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => onSettingsChange({ ...settings, joystickSize: s })}
                      className={`py-1.5 rounded-lg font-black uppercase text-[10px] border transition ${
                        settings.joystickSize === s
                          ? 'bg-yellow-500 text-black border-yellow-400 shadow-md'
                          : 'bg-black/40 border-white/20 text-gray-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-yellow-400 block mb-1">JOYSTICK POSITION</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['bottom', 'mid', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => onSettingsChange({ ...settings, joystickPosition: p })}
                      className={`py-1.5 rounded-lg font-black uppercase text-[10px] border transition ${
                        settings.joystickPosition === p
                          ? 'bg-yellow-500 text-black border-yellow-400 shadow-md'
                          : 'bg-black/40 border-white/20 text-gray-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-200 tracking-wider">TACTICAL LASER SIGHT</span>
              <input
                type="checkbox"
                checked={settings.enableLaserSight}
                onChange={(e) => onSettingsChange({ ...settings, enableLaserSight: e.target.checked })}
                className="w-5 h-5 accent-red-600 rounded cursor-pointer"
              />
            </div>

            {settings.enableLaserSight && (
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-red-400 text-[10px] tracking-wider uppercase">LASER COLOR</span>
                <div className="flex gap-1.5">
                  {(['red', 'green', 'cyan', 'yellow'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => onSettingsChange({ ...settings, laserColor: c })}
                      style={{
                        backgroundColor: c === 'red' ? '#ef4444' : c === 'green' ? '#22c55e' : c === 'cyan' ? '#06b6d4' : '#eab308'
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        settings.laserColor === c ? 'scale-125 border-white shadow-lg' : 'border-black/50 opacity-60'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onResume}
            className="w-full bg-[#2D5A27] hover:bg-green-700 border-2 border-green-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" /> RESUME MATCH
          </button>

          <button
            onClick={onSuicide}
            className="w-full bg-red-950/80 hover:bg-red-900 border-2 border-red-700 text-red-200 font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition"
          >
            <Skull className="w-4 h-4" /> COMMIT SUICIDE (RESPAWN)
          </button>

          <button
            onClick={onExit}
            className="w-full bg-black/60 hover:bg-black/80 text-gray-300 font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition border-2 border-white/20"
          >
            <LogOut className="w-4 h-4" /> EXIT TO MAIN MENU
          </button>
        </div>

      </div>
    </div>
  );
};

