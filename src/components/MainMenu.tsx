import React, { useState } from 'react';
import { GameSettings, MapId, BotDifficulty, GameMode } from '../types';
import { MAPS } from '../data/maps';
import { Play, Shield, Crosshair, Users, Settings, Volume2, Crown, Zap, Flame, Trophy, Target, Radio, Crosshair as RadarIcon } from 'lucide-react';

interface Props {
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
  onStartGame: (mode: GameMode) => void;
  onOpenArmory: () => void;
  onOpenArsenal: () => void;
  onOpenMultiplayer: () => void;
  playerAvatarName: string;
}

export const MainMenu: React.FC<Props> = ({
  settings,
  onSettingsChange,
  onStartGame,
  onOpenArmory,
  onOpenArsenal,
  onOpenMultiplayer,
  playerAvatarName
}) => {
  const [activeTab, setActiveTab] = useState<'play' | 'settings'>('play');

  return (
    <div className="relative w-full min-h-screen bg-[#4B5320] flex flex-col items-center justify-between p-4 sm:p-6 select-none font-sans text-white overflow-y-auto pb-16">
      
      {/* Background Military Gradient & Tactical Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#556B2F] via-[#3B4D20] to-[#2F4F4F] opacity-90 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none"></div>

      {/* Top Bar - Tactical Sergeant Major HUD Banner */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between bg-black/40 border-b-4 border-[#2D1B18] p-3 rounded-2xl backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-black/40 p-2 pr-6 rounded-r-full border-l-4 border-red-600">
            <div className="w-12 h-12 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center font-black text-black text-xl shadow-lg">7</div>
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-extrabold tracking-widest text-red-400 uppercase">SERGEANT MAJOR</div>
              <div className="w-44 h-3 bg-gray-800 rounded-full overflow-hidden border border-white/20">
                <div className="w-[85%] h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
              </div>
              <div className="w-44 h-2 bg-gray-800 rounded-full overflow-hidden border border-white/20">
                <div className="w-[60%] h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wider uppercase italic drop-shadow-md">MINI MILITIA</h1>
            <p className="text-[10px] text-yellow-400 font-extrabold tracking-[0.2em] uppercase">GO MULTIPLAYER EDITION</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenArmory}
            className="bg-[#3E2723] hover:bg-[#4E342E] border-2 border-[#5D4037] text-amber-200 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl transition-all"
          >
            <Shield className="w-4 h-4 text-yellow-400" /> ARMORY: <span className="text-white">{playerAvatarName}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-5xl my-auto py-8">
        
        {/* Navigation Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('play')}
            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all border-2 ${
              activeTab === 'play'
                ? 'bg-[#2D5A27] border-green-400 text-white shadow-lg shadow-green-900/50 scale-105'
                : 'bg-black/50 border-white/20 text-gray-300 hover:bg-black/70'
            }`}
          >
            COMBAT MODES
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all border-2 ${
              activeTab === 'settings'
                ? 'bg-[#2D5A27] border-green-400 text-white shadow-lg shadow-green-900/50 scale-105'
                : 'bg-black/50 border-white/20 text-gray-300 hover:bg-black/70'
            }`}
          >
            TACTICAL CONFIG
          </button>
        </div>

        {activeTab === 'play' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* ONLINE GO MULTIPLAYER CARD */}
            <div className="bg-emerald-950/60 border-2 border-emerald-500 hover:border-emerald-400 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md shadow-2xl transition group hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 bg-emerald-500/20 w-24 h-24 rounded-full blur-xl pointer-events-none"></div>
              <div>
                <div className="w-12 h-12 bg-emerald-900/90 border-2 border-emerald-400 rounded-xl flex items-center justify-center text-emerald-300 mb-4 group-hover:scale-110 transition shadow-lg">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-emerald-300 uppercase tracking-wider italic">GO MULTIPLAYER</h3>
                <p className="text-xs text-emerald-100/90 mt-2 leading-relaxed">
                  Join real-time Go Fast UDP WebRTC server matches. Host room codes, play PvP with 60Hz physics!
                </p>
              </div>

              <button
                onClick={onOpenMultiplayer}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition border-2 border-emerald-300 animate-pulse"
              >
                <Users className="w-4 h-4 fill-current" /> ONLINE LOBBY
              </button>
            </div>

            {/* PUBG BATTLE ROYALE CARD */}
            <div className="bg-yellow-950/60 border-2 border-yellow-500 hover:border-yellow-400 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md shadow-2xl transition group hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 bg-yellow-500/20 w-24 h-24 rounded-full blur-xl pointer-events-none"></div>
              <div>
                <div className="w-12 h-12 bg-yellow-900/90 border-2 border-yellow-400 rounded-xl flex items-center justify-center text-yellow-300 mb-4 group-hover:scale-110 transition shadow-lg">
                  <Target className="w-6 h-6 animate-pulse text-yellow-400" />
                </div>
                <h3 className="text-xl font-black text-yellow-300 uppercase tracking-wider italic">BATTLE ROYALE</h3>
                <p className="text-xs text-yellow-100/90 mt-2 leading-relaxed">
                  PUBG Style! Shrinking Blue Zone damage circle, Air Drop crate supplies, and Winner Winner Chicken Dinner!
                </p>
              </div>

              <button
                onClick={() => onStartGame('battle-royale')}
                className="w-full mt-6 bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-black py-3.5 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition border-2 border-yellow-300"
              >
                <Play className="w-4 h-4 fill-current" /> PLAY BATTLE ROYALE
              </button>
            </div>

            {/* Quick Bot Battle Card */}
            <div className="bg-black/50 border-2 border-white/20 hover:border-red-500/80 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md shadow-2xl transition group hover:-translate-y-1">
              <div>
                <div className="w-12 h-12 bg-red-950/80 border-2 border-red-600/60 rounded-xl flex items-center justify-center text-red-400 mb-4 group-hover:scale-110 transition">
                  <Crosshair className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider italic">BOT BATTLE</h3>
                <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                  Engage in fierce offline tactical skirmishes against AI combatants with jetpack nitro boost.
                </p>
              </div>

              <button
                onClick={() => onStartGame('custom')}
                className="w-full mt-6 bg-red-700 hover:bg-red-600 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition border-2 border-red-500"
              >
                <Play className="w-4 h-4 fill-current" /> OFFLINE BOT
              </button>
            </div>

            {/* Survival Mode Card */}
            <div className="bg-black/50 border-2 border-white/20 hover:border-yellow-500/80 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md shadow-2xl transition group hover:-translate-y-1">
              <div>
                <div className="w-12 h-12 bg-yellow-950/80 border-2 border-yellow-600/60 rounded-xl flex items-center justify-center text-yellow-400 mb-4 group-hover:scale-110 transition">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider italic">SURVIVAL WAVES</h3>
                <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                  Hold Outpost Alpha against relentless enemy wave assaults. Test your endurance under pressure!
                </p>
              </div>

              <button
                onClick={() => onStartGame('survival')}
                className="w-full mt-6 bg-amber-600 hover:bg-amber-500 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition border-2 border-amber-400"
              >
                <Play className="w-4 h-4 fill-current" /> SURVIVE NOW
              </button>
            </div>

            {/* Weapon Arsenal Card */}
            <div className="bg-black/50 border-2 border-white/20 hover:border-blue-500/80 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md shadow-2xl transition group hover:-translate-y-1">
              <div>
                <div className="w-12 h-12 bg-blue-950/80 border-2 border-blue-600/60 rounded-xl flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider italic">ARSENAL CATALOG</h3>
                <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                  Inspect the full loadout of 13 lethal military firearms, explosive RPGs, flamethrowers, and laser rifles.
                </p>
              </div>

              <button
                onClick={onOpenArsenal}
                className="w-full mt-6 bg-blue-700 hover:bg-blue-600 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition border-2 border-blue-400"
              >
                BROWSE WEAPONS
              </button>
            </div>

          </div>
        ) : (
          /* Match Settings Section */
          <div className="bg-black/60 border-2 border-white/20 rounded-2xl p-6 space-y-6 backdrop-blur-md shadow-2xl max-w-2xl mx-auto">
            
            {/* Map Selection */}
            <div>
              <label className="text-xs font-extrabold text-yellow-400 uppercase tracking-widest block mb-3">SELECT BATTLEGROUND MAP</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'outpost', label: 'Outpost Alpha' },
                  { id: 'catacombs', label: 'Catacombs' },
                  { id: 'hightower', label: 'High Tower' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSettingsChange({ ...settings, mapId: m.id as MapId })}
                    className={`p-3 rounded-xl text-xs font-black uppercase border-2 transition ${
                      settings.mapId === m.id
                        ? 'bg-[#2D5A27] border-green-400 text-white shadow-lg'
                        : 'bg-black/40 border-white/10 text-gray-300 hover:bg-black/60'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Match Duration Timer (Min 2 mins, Max 10 mins) */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-extrabold text-yellow-400 uppercase tracking-widest block">MATCH TIMER DURATION</label>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                  ⏱️ {Math.floor(settings.matchDuration / 60)} MINS ({settings.matchDuration}s)
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {[
                  { label: '2 MINS', val: 120 },
                  { label: '3 MINS', val: 180 },
                  { label: '5 MINS', val: 300 },
                  { label: '8 MINS', val: 480 },
                  { label: '10 MINS', val: 600 },
                ].map((dur) => (
                  <button
                    key={dur.val}
                    onClick={() => onSettingsChange({ ...settings, matchDuration: dur.val })}
                    className={`py-2 rounded-xl text-xs font-black uppercase border-2 transition ${
                      settings.matchDuration === dur.val
                        ? 'bg-amber-600 border-amber-400 text-white shadow-lg'
                        : 'bg-black/40 border-white/10 text-gray-300 hover:bg-black/60'
                    }`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="120"
                max="600"
                step="30"
                value={settings.matchDuration}
                onChange={(e) => onSettingsChange({ ...settings, matchDuration: parseInt(e.target.value) })}
                className="w-full accent-amber-500 h-2 bg-gray-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Bot Count Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black text-gray-200 tracking-wider">
                <span>BOT FORCES COUNT</span>
                <span className="text-red-400 font-extrabold">{settings.botCount} BOT SOLDIERS</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                value={settings.botCount}
                onChange={(e) => onSettingsChange({ ...settings, botCount: parseInt(e.target.value) })}
                className="w-full accent-red-600 h-2 bg-gray-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Bot Difficulty */}
            <div>
              <label className="text-xs font-extrabold text-yellow-400 uppercase tracking-widest block mb-3">TACTICAL DIFFICULTY LEVEL</label>
              <div className="grid grid-cols-4 gap-2">
                {['easy', 'medium', 'hard', 'pro'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => onSettingsChange({ ...settings, botDifficulty: diff as BotDifficulty })}
                    className={`p-2.5 rounded-xl text-xs font-black uppercase border-2 transition ${
                      settings.botDifficulty === diff
                        ? 'bg-red-700 border-red-500 text-white shadow-lg'
                        : 'bg-black/40 border-white/10 text-gray-300 hover:bg-black/60'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Touch Controls Toggle & Config */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-200 uppercase tracking-wider">ON-SCREEN DUAL TOUCH JOYSTICKS</span>
                <input
                  type="checkbox"
                  checked={settings.showTouchControls}
                  onChange={(e) => onSettingsChange({ ...settings, showTouchControls: e.target.checked })}
                  className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                />
              </div>

              {settings.showTouchControls && (
                <div className="grid grid-cols-2 gap-4 bg-black/40 p-3 rounded-xl border border-white/10">
                  <div>
                    <label className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-widest block mb-1.5">JOYSTICK SIZE</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['small', 'medium', 'large'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => onSettingsChange({ ...settings, joystickSize: s })}
                          className={`py-1.5 rounded-lg text-[10px] font-black uppercase border transition ${
                            settings.joystickSize === s
                              ? 'bg-yellow-500 text-black border-yellow-400 shadow-md'
                              : 'bg-black/40 border-white/10 text-gray-300'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-widest block mb-1.5">JOYSTICK POSITION</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['bottom', 'mid', 'high'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => onSettingsChange({ ...settings, joystickPosition: p })}
                          className={`py-1.5 rounded-lg text-[10px] font-black uppercase border transition ${
                            settings.joystickPosition === p
                              ? 'bg-yellow-500 text-black border-yellow-400 shadow-md'
                              : 'bg-black/40 border-white/10 text-gray-300'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tactical Laser Sight Config */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-200 uppercase tracking-wider">TACTICAL LASER SIGHT</span>
                <input
                  type="checkbox"
                  checked={settings.enableLaserSight}
                  onChange={(e) => onSettingsChange({ ...settings, enableLaserSight: e.target.checked })}
                  className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                />
              </div>

              {settings.enableLaserSight && (
                <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest">LASER SIGHT COLOR</span>
                  <div className="flex gap-2">
                    {(['red', 'green', 'cyan', 'yellow'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => onSettingsChange({ ...settings, laserColor: c })}
                        style={{
                          backgroundColor: c === 'red' ? '#ef4444' : c === 'green' ? '#22c55e' : c === 'cyan' ? '#06b6d4' : '#eab308'
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          settings.laserColor === c ? 'scale-125 border-white shadow-lg' : 'border-black/50 opacity-60'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Footer Controls & Command Bar */}
      <div className="relative z-10 text-center text-[11px] text-gray-300 font-mono tracking-widest space-y-1 bg-black/40 px-6 py-2 rounded-full border border-white/10">
        <p>[WASD / ARROWS] MOVE & JETPACK • [MOUSE] AIM & SHOOT • [R] RELOAD • [Q] SWAP • [G] GRENADE • [F] MELEE</p>
      </div>

    </div>
  );
};

