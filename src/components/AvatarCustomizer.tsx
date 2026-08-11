import React, { useRef, useEffect } from 'react';
import { AvatarConfig } from '../types';
import { drawAvatar } from './renderAvatar';
import { Shield, Sparkles, User, Palette, Crown } from 'lucide-react';

interface Props {
  avatar: AvatarConfig;
  onChange: (updated: AvatarConfig) => void;
  onClose: () => void;
}

export const AvatarCustomizer: React.FC<Props> = ({ avatar, onChange, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.03;
      const aim = Math.sin(angle) * 0.4;

      drawAvatar(
        ctx,
        avatar,
        canvas.width / 2,
        canvas.height / 2 + 10,
        2.2,
        aim,
        true,
        true, // show jetpack thruster
        false,
        'ar',
        false
      );

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [avatar]);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans text-white">
      <div className="bg-black/80 border-2 border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl">
        
        {/* Left Avatar Live Preview Stage */}
        <div className="md:w-1/2 bg-black/60 p-6 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-white/10">
          <div className="w-full text-center">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-yellow-400 bg-black/60 px-3 py-1 rounded-full border border-yellow-500/40">
              MILITIA ARMORY
            </span>
            <h2 className="text-2xl font-black text-white mt-2 flex items-center justify-center gap-2 italic uppercase tracking-wider">
              <Crown className="w-6 h-6 text-yellow-400" /> CUSTOMIZE SOLDIER
            </h2>
          </div>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 bg-green-500/10 rounded-full blur-2xl animate-pulse"></div>
            <canvas
              ref={canvasRef}
              width={260}
              height={260}
              className="relative z-10 bg-black/40 rounded-full border-2 border-white/20 shadow-inner"
            />
          </div>

          <div className="w-full space-y-2">
            <label className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-widest block">SOLDIER CALLSIGN</label>
            <input
              type="text"
              value={avatar.name}
              onChange={(e) => onChange({ ...avatar, name: e.target.value })}
              className="w-full bg-black/60 border-2 border-white/20 focus:border-red-500 rounded-xl px-4 py-3 text-white font-black text-center text-lg tracking-wider focus:outline-none uppercase"
              maxLength={12}
            />
          </div>
        </div>

        {/* Right Customization Controls */}
        <div className="md:w-1/2 p-6 overflow-y-auto space-y-6 bg-black/40">
          
          {/* Headgear */}
          <div>
            <label className="text-xs font-black text-yellow-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> HEADGEAR / HELMET
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'helmet_commander', label: 'Commander' },
                { id: 'beret_red', label: 'Red Beret' },
                { id: 'bandana_green', label: 'Bandana' },
                { id: 'cap_backwards', label: 'Cap' },
                { id: 'afro', label: 'Afro Hair' },
                { id: 'mask_gas', label: 'Gas Mask' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => onChange({ ...avatar, headgear: item.id as AvatarConfig['headgear'] })}
                  className={`p-2.5 rounded-xl text-xs font-black uppercase border-2 transition ${
                    avatar.headgear === item.id
                      ? 'bg-[#2D5A27] border-green-400 text-white shadow-lg'
                      : 'bg-black/40 border-white/10 text-gray-300 hover:bg-black/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Eye Style */}
          <div>
            <label className="text-xs font-black text-yellow-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> EYES EXPRESSION
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'normal', label: 'Normal' },
                { id: 'angry', label: 'Angry' },
                { id: 'shades', label: 'Cool Shades' },
                { id: 'determined', label: 'Determined' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => onChange({ ...avatar, eyeStyle: item.id as AvatarConfig['eyeStyle'] })}
                  className={`p-2.5 rounded-xl text-xs font-black uppercase border-2 transition ${
                    avatar.eyeStyle === item.id
                      ? 'bg-[#2D5A27] border-green-400 text-white shadow-lg'
                      : 'bg-black/40 border-white/10 text-gray-300 hover:bg-black/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Outfit Color */}
          <div>
            <label className="text-xs font-black text-yellow-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
              <Palette className="w-4 h-4" /> UNIFORM CAMOUFLAGE
            </label>
            <div className="flex gap-3">
              {[
                { color: '#27ae60', name: 'Jungle Camo' },
                { color: '#d35400', name: 'Desert Tan' },
                { color: '#2980b9', name: 'Urban Blue' },
                { color: '#2c3e50', name: 'Dark Ops' },
              ].map((c) => (
                <button
                  key={c.color}
                  onClick={() => onChange({ ...avatar, outfitColor: c.color })}
                  style={{ backgroundColor: c.color }}
                  className={`w-10 h-10 rounded-full border-2 transition ${
                    avatar.outfitColor === c.color ? 'border-white scale-110 ring-2 ring-yellow-400' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Facial Hair */}
          <div>
            <label className="text-xs font-black text-yellow-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4" /> FACIAL HAIR
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'none', label: 'Clean' },
                { id: 'mustache', label: 'Mustache' },
                { id: 'full_beard', label: 'Full Beard' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => onChange({ ...avatar, facialHair: item.id as AvatarConfig['facialHair'] })}
                  className={`p-2.5 rounded-xl text-xs font-black uppercase border-2 transition ${
                    avatar.facialHair === item.id
                      ? 'bg-[#2D5A27] border-green-400 text-white shadow-lg'
                      : 'bg-black/40 border-white/10 text-gray-300 hover:bg-black/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={onClose}
            className="w-full bg-[#2D5A27] hover:bg-green-700 border-2 border-green-500 text-white font-black py-3.5 rounded-xl text-center text-xs uppercase tracking-widest transition shadow-lg"
          >
            SAVE LOADOUT & RETURN
          </button>
        </div>

      </div>
    </div>
  );
};

