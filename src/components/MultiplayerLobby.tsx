import React, { useState, useEffect } from 'react';
import { AvatarConfig, MapId, GameMode, BotDifficulty } from '../types';
import { networkManager, RoomListItem } from '../network/networkManager';
import { Users, Server, Play, Plus, RefreshCw, Shield, Globe, Radio, CheckCircle2, ArrowLeft } from 'lucide-react';

interface Props {
  avatar: AvatarConfig;
  onBack: () => void;
  onStartMultiplayerGame: (roomCode: string, mapId: MapId) => void;
}

export const MultiplayerLobby: React.FC<Props> = ({ avatar, onBack, onStartMultiplayerGame }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Room Creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customRoomCode, setCustomRoomCode] = useState('');
  const [selectedMap, setSelectedMap] = useState<MapId>('outpost');
  const [selectedMode, setSelectedMode] = useState<GameMode>('custom');
  const [botCount, setBotCount] = useState(0);
  const [botDiff, setBotDiff] = useState<BotDifficulty>('medium');
  const [matchDuration, setMatchDuration] = useState(300); // in seconds (120 to 600)

  // Join by code input
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Active connected room state
  const [joinedRoom, setJoinedRoom] = useState<{ roomCode: string; mapId: string } | null>(null);
  const [pingMs, setPingMs] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const initNetwork = async () => {
      setIsConnecting(true);
      const success = await networkManager.connect();
      if (isMounted) {
        setIsConnected(success);
        setIsConnecting(false);
        if (success) {
          refreshRoomList();
        }
      }
    };

    networkManager.onConnectionChanged = (connected) => {
      if (isMounted) setIsConnected(connected);
    };

    networkManager.onPingUpdated = (ping) => {
      if (isMounted) setPingMs(ping);
    };

    networkManager.onJoinedRoom = (data) => {
      if (isMounted) {
        setJoinedRoom({ roomCode: data.roomCode, mapId: data.mapId as MapId });
      }
    };

    initNetwork();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshRoomList = async () => {
    setIsRefreshing(true);
    const list = await networkManager.fetchRoomList();
    setRooms(list);
    setIsRefreshing(false);
  };

  const handleCreateRoom = () => {
    const code = customRoomCode.trim().toUpperCase() || 'WAR88';
    networkManager.createRoom(code, selectedMap, selectedMode, botCount, botDiff, avatar, matchDuration);
    setShowCreateModal(false);
  };

  const handleJoinRoom = (code: string) => {
    networkManager.joinRoom(code.toUpperCase(), avatar);
  };

  const handleLaunchMatch = () => {
    if (joinedRoom) {
      onStartMultiplayerGame(joinedRoom.roomCode, joinedRoom.mapId as MapId);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#1E293B] text-white flex flex-col items-center justify-between p-4 sm:p-6 select-none font-sans overflow-y-auto pb-16">
      
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#020617] opacity-95 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] pointer-events-none"></div>

      {/* Header Banner */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between bg-black/50 border-b-4 border-emerald-600/60 p-4 rounded-2xl backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="bg-gray-800/80 hover:bg-gray-700 p-2.5 rounded-xl border border-white/20 transition flex items-center gap-2 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> MAIN MENU
          </button>
          <div>
            <h1 className="text-2xl font-black italic tracking-wider text-emerald-400 uppercase flex items-center gap-2">
              <Globe className="w-6 h-6 text-emerald-400 animate-pulse" /> GO MULTIPLAYER HUB
            </h1>
            <p className="text-[10px] text-gray-400 font-extrabold tracking-[0.2em] uppercase">
              HIGH PERFORMANCE GO WEBSOCKET ENGINE • 60HZ TICK
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Server Connection Status Badge */}
          <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-xl border border-white/10 text-xs font-bold">
            <Radio className={`w-4 h-4 ${isConnected ? 'text-emerald-400 animate-ping' : 'text-red-500'}`} />
            <span>{isConnecting ? 'CONNECTING...' : isConnected ? `ONLINE (${pingMs}ms)` : 'OFFLINE'}</span>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition border-2 border-emerald-400"
          >
            <Plus className="w-4 h-4" /> CREATE ROOM
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-5xl my-auto py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Server Browser Room List (2 cols) */}
        <div className="md:col-span-2 bg-black/50 border-2 border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-400" /> ACTIVE ROOM BROWSER
              </h3>
              <button
                onClick={refreshRoomList}
                disabled={isRefreshing}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border border-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> REFRESH
              </button>
            </div>

            {/* Room List Container */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
              {rooms.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm font-bold">No active public rooms found on Go server.</p>
                  <p className="text-xs mt-1 text-gray-500">Click "CREATE ROOM" or join via Room Code to host!</p>
                </div>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.code}
                    className="bg-black/60 border border-white/10 hover:border-emerald-500/60 p-4 rounded-xl flex items-center justify-between transition group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-950/80 border border-emerald-500/40 rounded-lg flex items-center justify-center font-black text-emerald-400 text-sm">
                        {room.code}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-white uppercase italic">{room.mapId.toUpperCase()} MAP</div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          MODE: {room.gameMode.toUpperCase()} • BOTS: {room.botCount}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/20">
                        {room.playerCount} / {room.maxPlayers} PLAYERS
                      </span>
                      <button
                        onClick={() => handleJoinRoom(room.code)}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white font-black px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition border border-emerald-400"
                      >
                        JOIN
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Join via Code Input */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-3">
            <input
              type="text"
              placeholder="ENTER ROOM CODE (e.g. WAR88)"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              className="flex-1 bg-black/60 border border-white/20 rounded-xl px-4 py-2.5 text-xs font-mono tracking-widest text-emerald-400 uppercase focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => {
                if (joinCodeInput.trim()) {
                  handleJoinRoom(joinCodeInput.trim());
                }
              }}
              disabled={!joinCodeInput.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-lg transition border border-blue-400"
            >
              JOIN CODE
            </button>
          </div>
        </div>

        {/* Right Column: Pre-game Joined Room Lobby Card */}
        <div className="bg-black/50 border-2 border-emerald-500/40 rounded-2xl p-6 backdrop-blur-md shadow-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-black uppercase italic tracking-wider text-emerald-400 border-b border-white/10 pb-3 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" /> MULTIPLAYER LOBBY
            </h3>

            {joinedRoom ? (
              <div className="space-y-4">
                <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl text-center space-y-2">
                  <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">CONNECTED ROOM CODE</div>
                  <div className="text-3xl font-black text-white font-mono tracking-widest">{joinedRoom.roomCode}</div>
                  <div className="text-xs text-gray-300 font-bold uppercase">{joinedRoom.mapId} BATTLEGROUND</div>
                </div>

                <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-300 font-mono">
                    <span>PLAYER NAME:</span>
                    <span className="text-white font-bold">{avatar.name}</span>
                  </div>
                  <div className="flex justify-between text-gray-300 font-mono">
                    <span>GO SERVER LATENCY:</span>
                    <span className="text-emerald-400 font-bold">{pingMs} ms</span>
                  </div>
                  <div className="flex justify-between text-gray-300 font-mono">
                    <span>NETCODE TICKRATE:</span>
                    <span className="text-yellow-400 font-bold">60 Hz</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400 space-y-2">
                <Radio className="w-8 h-8 text-emerald-400/50 mx-auto animate-bounce" />
                <p className="text-xs font-bold">Not currently in a server room.</p>
                <p className="text-[11px] text-gray-500">Join an active room or create one to launch!</p>
              </div>
            )}
          </div>

          <div>
            {joinedRoom ? (
              <button
                onClick={handleLaunchMatch}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl transition border-2 border-emerald-400 animate-pulse"
              >
                <Play className="w-5 h-5 fill-current" /> LAUNCH MULTIPLAYER MATCH
              </button>
            ) : (
              <button
                onClick={() => {
                  if (rooms.length > 0) {
                    handleJoinRoom(rooms[0].code);
                  } else {
                    setShowCreateModal(true);
                  }
                }}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition border border-emerald-400"
              >
                QUICK MATCH
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Modal: Create Room Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border-2 border-emerald-500/60 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-black uppercase italic tracking-wider text-emerald-400 border-b border-white/10 pb-2">
              CREATE GO MULTIPLAYER ROOM
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-widest block mb-1">ROOM CODE</label>
                <input
                  type="text"
                  placeholder="e.g. WAR88"
                  value={customRoomCode}
                  onChange={(e) => setCustomRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-2 text-xs font-mono text-emerald-400 uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-widest block mb-1">SELECT BATTLEGROUND MAP</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['outpost', 'catacombs', 'hightower'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMap(m)}
                      className={`p-2.5 rounded-xl text-[10px] font-black uppercase border transition ${
                        selectedMap === m
                          ? 'bg-emerald-700 border-emerald-400 text-white shadow-md'
                          : 'bg-black/40 border-white/10 text-gray-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-widest block">MATCH TIMER DURATION</label>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">⏱️ {Math.floor(matchDuration / 60)} MINS ({matchDuration}s)</span>
                </div>
                <div className="grid grid-cols-5 gap-1 mb-1.5">
                  {[
                    { label: '2M', val: 120 },
                    { label: '3M', val: 180 },
                    { label: '5M', val: 300 },
                    { label: '8M', val: 480 },
                    { label: '10M', val: 600 },
                  ].map((dur) => (
                    <button
                      key={dur.val}
                      onClick={() => setMatchDuration(dur.val)}
                      className={`py-1 rounded-lg text-[10px] font-black uppercase border transition ${
                        matchDuration === dur.val
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                          : 'bg-black/40 border-white/10 text-gray-300'
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
                  value={matchDuration}
                  onChange={(e) => setMatchDuration(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 h-2 bg-gray-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="bg-black/40 border border-emerald-500/30 p-3 rounded-xl text-center">
                <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" /> MULTIPLAYER ROOM TYPE
                </div>
                <div className="text-xs font-bold text-white uppercase mt-1">
                  HUMAN PLAYERS ONLY • NO AI BOTS
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase"
              >
                CANCEL
              </button>
              <button
                onClick={handleCreateRoom}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-widest border border-emerald-400"
              >
                CREATE & JOIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="relative z-10 text-center text-[10px] text-gray-400 font-mono">
        CONNECTED TO GO MULTIPLAYER WEBSOCKET SERVER • LOW LATENCY CLIENT-SIDE PREDICTION
      </div>

    </div>
  );
};
