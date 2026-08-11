import React, { useState } from 'react';
import { WEAPONS } from '../data/weapons';
import { WeaponType } from '../types';
import { soundEngine } from '../audio/soundEngine';
import { Crosshair, Volume2, ShieldAlert } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const WeaponGallery: React.FC<Props> = ({ onClose }) => {
  const [selected, setSelected] = useState<WeaponType>('ar');
  const weapon = WEAPONS[selected];

  const handleTestFire = () => {
    soundEngine.playWeaponShoot(selected);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans text-white">
      <div className="bg-black/80 border-2 border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl">
        
        {/* Left Weapon List */}
        <div className="md:w-1/3 bg-black/60 p-4 overflow-y-auto border-b md:border-b-0 md:border-r border-white/10 space-y-2">
          <h3 className="text-[10px] font-black uppercase text-yellow-400 tracking-[0.2em] px-2 mb-2">ARSENAL CATALOG</h3>
          {(Object.keys(WEAPONS) as WeaponType[]).map((key) => {
            const w = WEAPONS[key];
            return (
              <button
                key={key}
                onClick={() => {
                  setSelected(key);
                  soundEngine.playWeaponShoot(key);
                }}
                className={`w-full text-left p-3 rounded-xl border-2 flex items-center justify-between transition ${
                  selected === key
                    ? 'bg-[#2D5A27] border-green-400 text-white font-bold shadow-lg'
                    : 'bg-black/40 border-white/10 text-gray-300 hover:bg-black/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{w.iconSymbol}</span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">{w.name}</p>
                    <p className="text-[9px] text-gray-400 uppercase font-mono">{w.category}</p>
                  </div>
                </div>
                {w.isDualWieldable && (
                  <span className="text-[9px] bg-red-950 text-red-300 font-extrabold px-1.5 py-0.5 rounded border border-red-800 uppercase">
                    DUAL
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Weapon Details & Fire Tester */}
        <div className="md:w-2/3 p-6 flex flex-col justify-between bg-black/40 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-yellow-400 bg-black/60 px-3 py-1 rounded-full border border-yellow-500/40">
                  {weapon.category} SPECIFICATION
                </span>
                <h2 className="text-2xl font-black text-white mt-2 flex items-center gap-3 italic uppercase tracking-wider">
                  <span>{weapon.iconSymbol}</span> {weapon.name}
                </h2>
              </div>
              <button
                onClick={handleTestFire}
                className="bg-red-700 hover:bg-red-600 border-2 border-red-500 text-white font-black px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs uppercase tracking-widest shadow-lg transition active:scale-95"
              >
                <Volume2 className="w-4 h-4" /> TEST FIRE
              </button>
            </div>

            <p className="text-gray-200 text-xs mt-4 bg-black/60 p-4 rounded-xl border border-white/10 leading-relaxed">
              {weapon.description}
            </p>

            {/* Stat Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-300">
                  <span>DAMAGE OUTPUT</span>
                  <span className="text-yellow-400 font-mono">{weapon.damage}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                  <div className="h-full bg-red-600 rounded-full" style={{ width: `${Math.min(100, weapon.damage * 1.5)}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-300">
                  <span>FIRE RATE</span>
                  <span className="text-yellow-400 font-mono">{weapon.fireRate} rps</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, weapon.fireRate * 5)}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-300">
                  <span>MAGAZINE CAP</span>
                  <span className="text-yellow-400 font-mono">{weapon.magazineSize === Infinity ? '∞' : weapon.magazineSize}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (weapon.magazineSize / 100) * 100)}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-300">
                  <span>RELOAD SPEED</span>
                  <span className="text-yellow-400 font-mono">{weapon.reloadTime === 0 ? 'Instant' : `${(weapon.reloadTime / 1000).toFixed(1)}s`}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, 100 - (weapon.reloadTime / 3000) * 100)}%` }}></div>
                </div>
              </div>

            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 bg-black/60 hover:bg-black/80 text-gray-300 font-black py-3 rounded-xl border-2 border-white/20 text-xs uppercase tracking-widest transition"
          >
            RETURN TO MAIN MENU
          </button>
        </div>

      </div>
    </div>
  );
};

