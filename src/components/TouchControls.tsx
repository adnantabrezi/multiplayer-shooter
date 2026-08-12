import React, { useRef, useState } from 'react';
import { RefreshCw, Crosshair, Move, Settings2 } from 'lucide-react';

interface Props {
  onMove: (dx: number, dy: number, isBoosting: boolean, isCrouching: boolean) => void;
  onAimShoot: (angle: number | null, isShooting: boolean) => void;
  onReload: () => void;
  onSwapWeapon: () => void;
  onPickUpWeapon?: () => void;
  onThrowGrenade: () => void;
  onMelee: () => void;
  onCycleScope?: () => void;
  scopeZoomLevel?: string;
  activeWeaponName: string;
  nearbyPickupName?: string | null;
  grenadeCount: number;
  joystickSize?: 'small' | 'medium' | 'large';
  joystickPosition?: 'bottom' | 'mid' | 'high';
  onUpdateJoystickSettings?: (size: 'small' | 'medium' | 'large', pos: 'bottom' | 'mid' | 'high') => void;
}

export const TouchControls: React.FC<Props> = ({
  onMove,
  onAimShoot,
  onReload,
  onSwapWeapon,
  onPickUpWeapon,
  onThrowGrenade,
  onMelee,
  onCycleScope,
  scopeZoomLevel = '1X',
  activeWeaponName,
  nearbyPickupName,
  grenadeCount,
  joystickSize = 'medium',
  joystickPosition = 'bottom',
  onUpdateJoystickSettings
}) => {
  const leftStickRef = useRef<HTMLDivElement | null>(null);
  const rightStickRef = useRef<HTMLDivElement | null>(null);
  const leftKnobRef = useRef<HTMLDivElement | null>(null);
  const rightKnobRef = useRef<HTMLDivElement | null>(null);
  const [showQuickSettings, setShowQuickSettings] = useState(false);

  // Size dimensions map
  const sizePx = joystickSize === 'small' ? 104 : joystickSize === 'large' ? 168 : 136;
  const knobSizePx = joystickSize === 'small' ? 40 : joystickSize === 'large' ? 56 : 48;

  // Position padding map
  const bottomPaddingClass =
    joystickPosition === 'high' ? 'pb-16' : joystickPosition === 'mid' ? 'pb-10' : 'pb-4';

  // --- LEFT JOYSTICK HANDLERS ---
  const processLeftTouch = (clientX: number, clientY: number) => {
    if (!leftStickRef.current) return;
    const rect = leftStickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2;

    const clampedX = Math.max(-maxRadius, Math.min(maxRadius, dx));
    const clampedY = Math.max(-maxRadius, Math.min(maxRadius, dy));

    if (leftKnobRef.current) {
      leftKnobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }

    const normX = clampedX / maxRadius;
    const normY = clampedY / maxRadius;

    const isBoosting = dy < -35;
    const isCrouching = dy > 35;

    onMove(normX, normY, isBoosting, isCrouching);
  };

  const handleLeftTouchStart = (e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    if (touch) processLeftTouch(touch.clientX, touch.clientY);
  };

  const handleLeftTouchMove = (e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    if (touch) processLeftTouch(touch.clientX, touch.clientY);
  };

  const handleLeftTouchEnd = (e?: React.TouchEvent) => {
    if (e && e.cancelable) e.preventDefault();
    if (leftKnobRef.current) {
      leftKnobRef.current.style.transform = 'translate(0px, 0px)';
    }
    onMove(0, 0, false, false);
  };

  // --- RIGHT JOYSTICK HANDLERS ---
  const processRightTouch = (clientX: number, clientY: number) => {
    if (!rightStickRef.current) return;
    const rect = rightStickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);
    const maxRadius = rect.width / 2;

    const clampedX = Math.max(-maxRadius, Math.min(maxRadius, dx));
    const clampedY = Math.max(-maxRadius, Math.min(maxRadius, dy));

    if (rightKnobRef.current) {
      rightKnobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }

    const isShooting = dist > 18;
    onAimShoot(angle, isShooting);
  };

  const handleRightTouchStart = (e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    if (touch) processRightTouch(touch.clientX, touch.clientY);
  };

  const handleRightTouchMove = (e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    if (touch) processRightTouch(touch.clientX, touch.clientY);
  };

  const handleRightTouchEnd = (e?: React.TouchEvent) => {
    if (e && e.cancelable) e.preventDefault();
    if (rightKnobRef.current) {
      rightKnobRef.current.style.transform = 'translate(0px, 0px)';
    }
    onAimShoot(null, false);
  };

  return (
    <div className={`absolute inset-0 pointer-events-none z-30 flex justify-between p-4 ${bottomPaddingClass} select-none font-sans`}>
      
      {/* Quick Joystick Customizer Overlay Toggle Button (Top Center) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-auto z-40">
        <button
          onClick={() => setShowQuickSettings(!showQuickSettings)}
          className="bg-black/60 hover:bg-black/80 border border-white/20 text-yellow-400 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 shadow-lg backdrop-blur-md"
        >
          <Settings2 className="w-3.5 h-3.5" /> JOYSTICK CONFIG
        </button>

        {/* Quick Customizer Popup Panel */}
        {showQuickSettings && onUpdateJoystickSettings && (
          <div className="mt-2 bg-black/90 border-2 border-yellow-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md w-64 space-y-3 text-white text-xs">
            <div>
              <span className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-wider block mb-1">JOYSTICK SIZE</span>
              <div className="grid grid-cols-3 gap-1">
                {(['small', 'medium', 'large'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateJoystickSettings(s, joystickPosition)}
                    className={`py-1 rounded font-bold uppercase text-[10px] border ${
                      joystickSize === s ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-gray-800 border-gray-700 text-gray-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-wider block mb-1">HEIGHT POSITION</span>
              <div className="grid grid-cols-3 gap-1">
                {(['bottom', 'mid', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => onUpdateJoystickSettings(joystickSize, p)}
                    className={`py-1 rounded font-bold uppercase text-[10px] border ${
                      joystickPosition === p ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-gray-800 border-gray-700 text-gray-300'
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

      {/* Left Movement & Jetpack Joystick */}
      <div className="flex flex-col items-center justify-end pointer-events-auto">
        <div
          ref={leftStickRef}
          onTouchStart={handleLeftTouchStart}
          onTouchMove={handleLeftTouchMove}
          onTouchEnd={handleLeftTouchEnd}
          style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
          className="bg-black/50 border-2 border-green-400/60 rounded-full relative flex items-center justify-center backdrop-blur-md shadow-2xl touch-none"
        >
          {/* Inner Thumbstick Knob */}
          <div
            ref={leftKnobRef}
            style={{
              width: `${knobSizePx}px`,
              height: `${knobSizePx}px`,
              transform: 'translate(0px, 0px)'
            }}
            className="bg-green-500/90 border-2 border-white rounded-full shadow-[0_0_15px_rgba(34,197,94,0.8)] flex items-center justify-center pointer-events-none"
          >
            <Move className="w-4 h-4 text-white opacity-80" />
          </div>
          <span className="absolute top-2 text-[9px] font-black text-green-400 tracking-wider">BOOST 🚀</span>
          <span className="absolute bottom-2 text-[9px] font-black text-green-400 tracking-wider">CROUCH 🛡️</span>
        </div>
      </div>

      {/* Right Action Buttons & Aim Joystick */}
      <div className="flex flex-col items-end justify-end pointer-events-auto gap-3">
        
        {/* Action Buttons Arc */}
        <div className="flex gap-2.5">
          {nearbyPickupName && onPickUpWeapon && (
            <button
              onClick={onPickUpWeapon}
              className="px-3 h-11 bg-yellow-500 hover:bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center text-black font-black text-xs active:scale-95 shadow-2xl animate-pulse backdrop-blur-sm"
              title="Pick up weapon [E]"
            >
              ⚡ PICKUP [E] ({nearbyPickupName})
            </button>
          )}

          <button
            onClick={onReload}
            className="w-11 h-11 bg-black/60 border-2 border-white/30 rounded-full flex items-center justify-center text-white font-black text-xs active:scale-90 shadow-xl backdrop-blur-sm"
            title="Reload"
          >
            <RefreshCw className="w-4 h-4 text-yellow-400" />
          </button>

          <button
            onClick={onSwapWeapon}
            className="w-11 h-11 bg-black/60 border-2 border-amber-400/80 rounded-full flex items-center justify-center text-amber-300 font-black text-[10px] tracking-tighter active:scale-90 shadow-xl backdrop-blur-sm"
            title="Swap Weapon"
          >
            SWAP
          </button>

          <button
            onClick={onThrowGrenade}
            className="w-11 h-11 bg-black/60 border-2 border-red-500/80 rounded-full flex items-center justify-center text-white font-black text-xs active:scale-90 shadow-xl relative backdrop-blur-sm"
            title="Grenade"
          >
            💣
            <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white">
              {grenadeCount}
            </span>
          </button>

          <button
            onClick={onMelee}
            className="w-11 h-11 bg-black/60 border-2 border-blue-400/80 rounded-full flex items-center justify-center text-white font-black text-xs active:scale-90 shadow-xl backdrop-blur-sm"
            title="Melee Attack"
          >
            👊
          </button>
        </div>

        {/* Right Aim & Shoot Joystick */}
        <div
          ref={rightStickRef}
          onTouchStart={handleRightTouchStart}
          onTouchMove={handleRightTouchMove}
          onTouchEnd={handleRightTouchEnd}
          style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
          className="bg-black/50 border-2 border-red-500/60 rounded-full relative flex items-center justify-center backdrop-blur-md shadow-2xl touch-none"
        >
          <div
            ref={rightKnobRef}
            style={{
              width: `${knobSizePx}px`,
              height: `${knobSizePx}px`,
              transform: 'translate(0px, 0px)'
            }}
            className="bg-red-600/90 border-2 border-white rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)] flex items-center justify-center pointer-events-none"
          >
            <Crosshair className="w-5 h-5 text-white" />
          </div>
          <span className="absolute text-[9px] font-black text-red-400 uppercase tracking-widest pointer-events-none">AIM & FIRE</span>
        </div>

      </div>

    </div>
  );
};
