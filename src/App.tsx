import React, { useState } from 'react';
import { AvatarConfig, EndMatchStats, GameMode, GameSettings, MapId } from './types';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { AvatarCustomizer } from './components/AvatarCustomizer';
import { WeaponGallery } from './components/WeaponGallery';
import { PauseOverlay } from './components/PauseOverlay';
import { EndGameModal } from './components/EndGameModal';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { NetworkHUD } from './components/NetworkHUD';
import { soundEngine } from './audio/soundEngine';

const DEFAULT_AVATAR: AvatarConfig = {
  headgear: 'helmet_commander',
  hairColor: '#2d3436',
  skinTone: '#ffeaa7',
  eyeStyle: 'angry',
  facialHair: 'mustache',
  outfitColor: '#27ae60',
  outfitPattern: 'camo',
  name: 'Sargeant'
};

const DEFAULT_SETTINGS: GameSettings = {
  soundVolume: 0.8,
  musicVolume: 0.5,
  botCount: 4,
  botDifficulty: 'medium',
  matchDuration: 300,
  killLimit: 15,
  goreEnabled: true,
  showTouchControls: false,
  joystickSize: 'medium',
  joystickPosition: 'bottom',
  enableLaserSight: true,
  laserColor: 'red',
  mapId: 'outpost',
  gameMode: 'custom'
};

const loadSavedAvatar = (): AvatarConfig => {
  try {
    const saved = localStorage.getItem('mini_militia_avatar');
    if (saved) return { ...DEFAULT_AVATAR, ...JSON.parse(saved) };
  } catch (e) {}
  return DEFAULT_AVATAR;
};

const loadSavedSettings = (): GameSettings => {
  try {
    const saved = localStorage.getItem('mini_militia_settings');
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {}
  return DEFAULT_SETTINGS;
};

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'multiplayer-lobby' | 'playing' | 'paused' | 'ended'>('menu');
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  // Custom Avatar Configuration (Loaded from & saved to localStorage)
  const [avatar, setAvatar] = useState<AvatarConfig>(loadSavedAvatar);

  // Game Settings (Loaded from & saved to localStorage)
  const [settings, setSettings] = useState<GameSettings>(loadSavedSettings);

  // Persist Avatar to localStorage on change
  React.useEffect(() => {
    try {
      localStorage.setItem('mini_militia_avatar', JSON.stringify(avatar));
    } catch (e) {}
  }, [avatar]);

  // Persist Settings to localStorage on change & sync sound engine
  React.useEffect(() => {
    try {
      localStorage.setItem('mini_militia_settings', JSON.stringify(settings));
    } catch (e) {}
    soundEngine.setVolumes(settings.soundVolume, settings.musicVolume);
  }, [settings]);

  // Modals
  const [isArmoryOpen, setIsArmoryOpen] = useState(false);
  const [isArsenalOpen, setIsArsenalOpen] = useState(false);
  const [matchStats, setMatchStats] = useState<EndMatchStats | null>(null);

  // Auto Fullscreen Manager for in-game screens
  const requestFullscreenMode = () => {
    try {
      const elem = document.documentElement as any;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } catch (e) {
      // Ignore non-user-initiated fullscreen restrictions
    }
  };

  const exitFullscreenMode = () => {
    try {
      const doc = document as any;
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement) {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        }
      }
    } catch (e) {}
  };

  React.useEffect(() => {
    if (screen === 'playing') {
      requestFullscreenMode();
    } else if (screen === 'menu') {
      exitFullscreenMode();
    }
  }, [screen]);

  const handleStartGame = (mode: GameMode) => {
    setIsMultiplayer(false);
    setSettings((prev) => ({ ...prev, gameMode: mode }));
    requestFullscreenMode();
    setScreen('playing');
  };

  const handleStartMultiplayerGame = (code: string, mapId: MapId) => {
    setIsMultiplayer(true);
    setRoomCode(code);
    setSettings((prev) => ({ ...prev, mapId }));
    requestFullscreenMode();
    setScreen('playing');
  };

  const handlePause = () => {
    setScreen('paused');
  };

  const handleResume = () => {
    requestFullscreenMode();
    setScreen('playing');
  };

  const handleExitToMenu = () => {
    exitFullscreenMode();
    setScreen('menu');
  };

  const handleMatchEnd = (stats: EndMatchStats) => {
    setMatchStats(stats);
    setScreen('ended');
  };

  return (
    <div className={`w-full ${screen === 'playing' ? 'h-screen overflow-hidden' : 'min-h-screen overflow-y-auto'} bg-slate-950 font-sans`}>
      
      {screen === 'menu' && (
        <MainMenu
          settings={settings}
          onSettingsChange={setSettings}
          onStartGame={handleStartGame}
          onOpenArmory={() => setIsArmoryOpen(true)}
          onOpenArsenal={() => setIsArsenalOpen(true)}
          onOpenMultiplayer={() => setScreen('multiplayer-lobby')}
          playerAvatarName={avatar.name}
        />
      )}

      {screen === 'multiplayer-lobby' && (
        <MultiplayerLobby
          avatar={avatar}
          onBack={handleExitToMenu}
          onStartMultiplayerGame={handleStartMultiplayerGame}
        />
      )}

      {(screen === 'playing' || screen === 'paused' || screen === 'multiplayer-lobby') && (
        <NetworkHUD />
      )}

      {(screen === 'playing' || screen === 'paused') && (
        <GameCanvas
          settings={settings}
          playerAvatar={avatar}
          onPause={handlePause}
          onMatchEnd={handleMatchEnd}
          isMultiplayer={isMultiplayer}
          roomCode={roomCode}
        />
      )}

      {screen === 'paused' && (
        <PauseOverlay
          onResume={handleResume}
          onSuicide={() => {
            handleResume();
          }}
          onExit={handleExitToMenu}
          settings={settings}
          onSettingsChange={setSettings}
        />
      )}

      {screen === 'ended' && matchStats && (
        <EndGameModal
          stats={matchStats}
          onPlayAgain={() => {
            setMatchStats(null);
            if (isMultiplayer) {
              // Go back to multiplayer lobby for a fresh room
              setScreen('multiplayer-lobby');
            } else {
              // Force GameCanvas remount by toggling screen
              setScreen('menu');
              setTimeout(() => {
                requestFullscreenMode();
                setScreen('playing');
              }, 50);
            }
          }}
          onExit={handleExitToMenu}
        />
      )}

      {/* Armory Customizer Overlay */}
      {isArmoryOpen && (
        <AvatarCustomizer
          avatar={avatar}
          onChange={setAvatar}
          onClose={() => setIsArmoryOpen(false)}
        />
      )}

      {/* Weapon Gallery Overlay */}
      {isArsenalOpen && (
        <WeaponGallery onClose={() => setIsArsenalOpen(false)} />
      )}

    </div>
  );
}
