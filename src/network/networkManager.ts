import { AirDrop, AvatarConfig, BlueZoneState, Bullet, GrenadeEntity, HealthCrate, KillFeedEntry, Player, WeaponPickup } from '../types';

export interface ServerSnapshot {
  tick: number;
  roomCode: string;
  mapId: string;
  timeRemaining: number;
  players: Player[];
  bullets: Bullet[];
  grenades: GrenadeEntity[];
  blueZone?: BlueZoneState;
  airDrops?: AirDrop[];
  pickups: WeaponPickup[];
  healthCrates: HealthCrate[];
  boosterCrates?: HealthCrate[];
  killFeed: KillFeedEntry[];
  timestamp: number; // local time received
}

export interface ClientInputState {
  seq: number;
  moveLeft: boolean;
  moveRight: boolean;
  boost: boolean;
  crouch: boolean;
  aimAngle: number;
  isShooting: boolean;
  throwGrenade: boolean;
  grenadeFuse?: number;
  swapWeapon: boolean;
  pickUpWeapon: boolean;
  reload: boolean;
  melee: boolean;
}

export interface RoomListItem {
  code: string;
  mapId: string;
  gameMode: string;
  playerCount: number;
  maxPlayers: number;
  botCount: number;
  isStarted: boolean;
}

const getBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    // If dev server (Vite on port 5173), target backend on port 8080
    if (window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:8080`;
    }
    // Production (served by Go server on Render at https://mini-militia-game.onrender.com or localhost)
    return window.location.origin;
  }
  return 'http://localhost:8080';
};

const getWsUrl = () => {
  const baseUrl = getBaseUrl();
  const wsProtocol = baseUrl.startsWith('https') ? 'wss:' : 'ws:';
  const host = baseUrl.replace(/^https?:\/\//, '');
  return `${wsProtocol}//${host}/api/ws`;
};

class NetworkManager {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  public clientId: string = '';
  public currentRoomCode: string = '';
  public isConnected: boolean = false;
  public pingMs: number = 0;

  private pingInterval: any = null;
  private inputSeq: number = 0;

  // Snapshot Buffer for Entity Interpolation
  private snapshotBuffer: ServerSnapshot[] = [];
  private maxBufferSize = 20;

  public inKbs: number = 0;
  public outKbs: number = 0;
  public pps: number = 0;

  private bytesInWindow: number = 0;
  private bytesOutWindow: number = 0;
  private packetsInWindow: number = 0;
  private packetsOutWindow: number = 0;
  private telemetryInterval: any = null;

  // Callbacks
  public onSnapshotReceived?: (snapshot: ServerSnapshot, interpolatedPlayers: Player[]) => void;
  public onJoinedRoom?: (data: { roomCode: string; mapId: string; clientId: string }) => void;
  public onPingUpdated?: (pingMs: number) => void;
  public onConnectionChanged?: (connected: boolean) => void;
  public onTelemetryUpdated?: (telemetry: { ping: number; inKbs: number; outKbs: number; pps: number }) => void;

  public async connect(_url?: string): Promise<boolean> {
    if ((this.ws && this.ws.readyState === WebSocket.OPEN) || (this.dc && this.dc.readyState === 'open')) {
      return true;
    }

    this.disconnect();

    // 1. Primary: High performance WebSocket over TCP (100% cloud / Render proxy compatible)
    const wsSuccess = await this.connectWebSocket();
    if (wsSuccess) {
      return true;
    }

    // 2. Secondary: Fallback to WebRTC DataChannel (UDP)
    return this.connectWebRTC();
  }

  private connectWebSocket(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        const wsUrl = getWsUrl();
        console.log('⚡ Connecting to Go WebSocket engine at:', wsUrl);
        const socket = new WebSocket(wsUrl);
        socket.binaryType = 'arraybuffer';

        let isResolved = false;

        socket.onopen = () => {
          this.ws = socket;
          this.isConnected = true;
          this.onConnectionChanged?.(true);
          this.startPingLoop();
          if (!isResolved) {
            isResolved = true;
            resolve(true);
          }
        };

        socket.onmessage = (event) => {
          this.handleRawMessage(event.data);
        };

        socket.onerror = (err) => {
          console.warn('WebSocket connection attempt error:', err);
          if (!isResolved) {
            isResolved = true;
            resolve(false);
          }
        };

        socket.onclose = () => {
          if (this.ws === socket) {
            this.isConnected = false;
            this.onConnectionChanged?.(false);
            this.stopPingLoop();
            this.ws = null;
          }
        };

        // Timeout connection attempt after 3.5 seconds
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            resolve(false);
          }
        }, 3500);
      } catch (e) {
        console.error('WebSocket connection error:', e);
        resolve(false);
      }
    });
  }

  private connectWebRTC(): Promise<boolean> {
    try {
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      this.dc = this.pc.createDataChannel('game', {
        ordered: false,
        maxRetransmits: 0
      });

      return new Promise<boolean>((resolve) => {
        let isResolved = false;

        this.dc!.onopen = () => {
          this.isConnected = true;
          this.onConnectionChanged?.(true);
          this.startPingLoop();
          if (!isResolved) {
            isResolved = true;
            resolve(true);
          }
        };

        this.dc!.binaryType = 'arraybuffer';

        this.dc!.onmessage = (event) => {
          this.handleRawMessage(event.data);
        };

        this.dc!.onerror = (err) => {
          console.warn('RTCDataChannel error:', err);
          this.isConnected = false;
          this.onConnectionChanged?.(false);
          if (!isResolved) {
            isResolved = true;
            resolve(false);
          }
        };

        this.dc!.onclose = () => {
          this.isConnected = false;
          this.onConnectionChanged?.(false);
          this.stopPingLoop();
        };

        // Create SDP Offer
        this.pc!.createOffer()
          .then((offer) => this.pc!.setLocalDescription(offer))
          .then(() => {
            return new Promise<void>((res) => {
              if (this.pc!.iceGatheringState === 'complete') {
                res();
              } else {
                const checkGathering = () => {
                  if (this.pc!.iceGatheringState === 'complete') {
                    this.pc!.removeEventListener('icegatheringstatechange', checkGathering);
                    res();
                  }
                };
                this.pc!.addEventListener('icegatheringstatechange', checkGathering);
                setTimeout(res, 800);
              }
            });
          })
          .then(async () => {
            const localSdp = this.pc!.localDescription;
            if (!localSdp) {
              if (!isResolved) {
                isResolved = true;
                resolve(false);
              }
              return;
            }

            const offerUrl = `${getBaseUrl()}/api/rtc/offer`;
            const res = await fetch(offerUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sdp: localSdp.sdp, type: localSdp.type })
            });

            if (!res.ok) {
              if (!isResolved) {
                isResolved = true;
                resolve(false);
              }
              return;
            }

            const answer = await res.json();
            await this.pc!.setRemoteDescription(new RTCSessionDescription(answer));
          })
          .catch((e) => {
            console.error('WebRTC offer error:', e);
            if (!isResolved) {
              isResolved = true;
              resolve(false);
            }
          });
      });
    } catch (e) {
      console.error('WebRTC connection error:', e);
      return Promise.resolve(false);
    }
  }

  private handleRawMessage(rawData: any) {
    try {
      if (rawData instanceof ArrayBuffer) {
        this.bytesInWindow += rawData.byteLength;
        this.packetsInWindow++;
        const u8 = new Uint8Array(rawData);
        if (u8[0] === 0x02) {
          // PacketTypeSnapshot binary ArrayBuffer
          const view = new DataView(rawData);
          const jsonLen = view.getUint32(1, true);
          const jsonText = new TextDecoder().decode(u8.subarray(5, 5 + jsonLen));
          const snapshotData = JSON.parse(jsonText);
          this.handleServerMessage(snapshotData);
        }
      } else if (typeof rawData === 'string') {
        this.bytesInWindow += rawData.length;
        this.packetsInWindow++;
        const data = JSON.parse(rawData);
        this.handleServerMessage(data);
      }
    } catch (e) {
      console.error('Failed to parse server packet:', e);
    }
  }

  public disconnect() {
    this.stopPingLoop();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.isConnected = false;
    this.onConnectionChanged?.(false);
  }

  public createRoom(
    roomCode: string,
    mapId: string,
    mode: string,
    botCount: number,
    botDifficulty: string,
    avatar: AvatarConfig,
    matchDuration: number = 300
  ) {
    this.send({
      type: 'create_room',
      roomCode,
      mapId,
      mode,
      botCount,
      botDifficulty,
      avatar,
      matchDuration
    });
  }

  public joinRoom(roomCode: string, avatar: AvatarConfig) {
    this.send({
      type: 'join_room',
      roomCode,
      avatar
    });
  }

  public leaveRoom() {
    this.send({ type: 'leave_room' });
    this.currentRoomCode = '';
  }

  public sendPlayerState(player: Player) {
    this.send({
      type: 'player_state',
      playerState: {
        id: player.id,
        name: player.name,
        team: player.team,
        avatar: player.avatar,
        x: Math.round(player.x * 10) / 10,
        y: Math.round(player.y * 10) / 10,
        vx: Math.round(player.vx * 10) / 10,
        vy: Math.round(player.vy * 10) / 10,
        aimAngle: Math.round(player.aimAngle * 1000) / 1000,
        facingRight: player.facingRight,
        isBoosting: player.isBoosting,
        isCrouching: player.isCrouching,
        isMeleeAttacking: player.isMeleeAttacking,
        health: Math.round(player.health),
        maxHealth: player.maxHealth,
        nitro: Math.round(player.nitro),
        maxNitro: player.maxNitro,
        primaryWeapon: player.primaryWeapon,
        secondaryWeapon: player.secondaryWeapon,
        currentMag: player.currentMag,
        reserveAmmo: player.reserveAmmo,
        secondaryMag: player.secondaryMag !== undefined ? player.secondaryMag : 0,
        secondaryReserve: player.secondaryReserve !== undefined ? player.secondaryReserve : 0,
        isDead: player.isDead,
        isReloading: player.isReloading,
        reloadProgress: Math.round((player.reloadProgress || 0) * 1000) / 1000,
        kills: player.kills,
        deaths: player.deaths
      }
    });
  }

  public sendBulletSpawn(bullet: Bullet) {
    this.send({
      type: 'spawn_bullet',
      bullet
    });
  }

  public sendGrenadeSpawn(grenade: GrenadeEntity) {
    this.send({
      type: 'spawn_grenade',
      grenade
    });
  }

  public sendPlayerHit(targetId: string, damage: number, weapon: string) {
    this.send({
      type: 'player_hit',
      hit: {
        targetId,
        damage,
        shooterId: this.clientId,
        weapon
      }
    });
  }

  public sendKillEvent(kill: KillFeedEntry) {
    this.send({
      type: 'kill_event',
      kill
    });
  }

  public sendInput(input: Omit<ClientInputState, 'seq'>): number {
    this.inputSeq++;

    const buf = new ArrayBuffer(15);
    const view = new DataView(buf);
    const uint8 = new Uint8Array(buf);

    // Packet Type: 0x01 (Input)
    uint8[0] = 0x01;

    // Seq (bytes 1-4)
    view.setUint32(1, this.inputSeq, true);

    // Flags 1 (byte 5)
    let flags1 = 0;
    if (input.moveLeft) flags1 |= 1 << 0;
    if (input.moveRight) flags1 |= 1 << 1;
    if (input.boost) flags1 |= 1 << 2;
    if (input.crouch) flags1 |= 1 << 3;
    if (input.isShooting) flags1 |= 1 << 4;
    if (input.throwGrenade) flags1 |= 1 << 5;
    if (input.swapWeapon) flags1 |= 1 << 6;
    if (input.pickUpWeapon) flags1 |= 1 << 7;
    uint8[5] = flags1;

    // Flags 2 (byte 6)
    let flags2 = 0;
    if (input.reload) flags2 |= 1 << 0;
    if (input.melee) flags2 |= 1 << 1;
    uint8[6] = flags2;

    // AimAngle (bytes 7-10)
    view.setFloat32(7, input.aimAngle, true);

    // GrenadeFuse (bytes 11-14)
    view.setFloat32(11, input.grenadeFuse || 5.0, true);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(buf);
      this.bytesOutWindow += buf.byteLength;
      this.packetsOutWindow++;
    } else if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(buf);
      this.bytesOutWindow += buf.byteLength;
      this.packetsOutWindow++;
    }

    return this.inputSeq;
  }

  private send(msg: any) {
    const str = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(str);
      this.bytesOutWindow += str.length;
      this.packetsOutWindow++;
    } else if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(str);
      this.bytesOutWindow += str.length;
      this.packetsOutWindow++;
    }
  }

  private startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'ping',
          timestamp: Date.now()
        });
      }
    }, 2000);

    this.telemetryInterval = setInterval(() => {
      this.inKbs = Math.round((this.bytesInWindow / 1024) * 10) / 10;
      this.outKbs = Math.round((this.bytesOutWindow / 1024) * 10) / 10;
      this.pps = this.packetsInWindow + this.packetsOutWindow;

      this.bytesInWindow = 0;
      this.bytesOutWindow = 0;
      this.packetsInWindow = 0;
      this.packetsOutWindow = 0;

      this.onTelemetryUpdated?.({
        ping: this.pingMs,
        inKbs: this.inKbs,
        outKbs: this.outKbs,
        pps: this.pps
      });
    }, 1000);
  }

  private stopPingLoop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
  }

  private handleServerMessage(data: any) {
    switch (data.type) {
      case 'joined':
        this.currentRoomCode = data.roomCode;
        this.clientId = data.clientId;
        this.onJoinedRoom?.({
          roomCode: data.roomCode,
          mapId: data.mapId,
          clientId: data.clientId
        });
        break;

      case 'pong':
        if (data.pingTs) {
          this.pingMs = Math.max(1, Date.now() - data.pingTs);
          this.onPingUpdated?.(this.pingMs);
        }
        break;

      case 'snapshot':
        const snapshot: ServerSnapshot = {
          tick: data.tick,
          roomCode: data.roomCode,
          mapId: data.mapId,
          timeRemaining: data.timeRemaining,
          players: data.players || [],
          bullets: data.bullets || [],
          grenades: data.grenades || [],
          blueZone: data.blueZone,
          airDrops: data.airDrops || [],
          pickups: data.pickups || [],
          healthCrates: data.healthCrates || [],
          boosterCrates: data.boosterCrates || [],
          killFeed: data.killFeed || [],
          timestamp: Date.now()
        };

        this.snapshotBuffer.push(snapshot);
        if (this.snapshotBuffer.length > this.maxBufferSize) {
          this.snapshotBuffer.shift();
        }

        const interpolatedPlayers = this.getInterpolatedPlayers();
        this.onSnapshotReceived?.(snapshot, interpolatedPlayers);
        break;
    }
  }

  /**
   * Linear / Hermite Entity Interpolation for remote players
   * Smoothly renders remote entities ~50ms in the past to eliminate jitter & stutters
   */
  public getInterpolatedPlayers(): Player[] {
    if (this.snapshotBuffer.length === 0) return [];
    if (this.snapshotBuffer.length === 1) {
      return this.snapshotBuffer[0].players || [];
    }

    const latestSnap = this.snapshotBuffer[this.snapshotBuffer.length - 1];
    const prevSnap = this.snapshotBuffer[this.snapshotBuffer.length - 2];

    // Find interpolation interval matching renderTime (~50ms behind live)
    const renderTime = Date.now() - 50;
    let fromSnap = prevSnap;
    let toSnap = latestSnap;

    for (let i = 0; i < this.snapshotBuffer.length - 1; i++) {
      if (
        this.snapshotBuffer[i].timestamp <= renderTime &&
        this.snapshotBuffer[i + 1].timestamp >= renderTime
      ) {
        fromSnap = this.snapshotBuffer[i];
        toSnap = this.snapshotBuffer[i + 1];
        break;
      }
    }

    const duration = Math.max(1, toSnap.timestamp - fromSnap.timestamp);
    const t = Math.min(1.2, Math.max(0, (renderTime - fromSnap.timestamp) / duration));

    const interpolated: Player[] = [];
    const fromMap = new Map(fromSnap.players.map((p) => [p.id, p]));

    for (const toP of toSnap.players) {
      // Local player is predicted locally, do not interpolate local player
      if (toP.id === this.clientId) {
        interpolated.push(toP);
        continue;
      }

      const fromP = fromMap.get(toP.id);
      if (!fromP || fromP.isDead || toP.isDead) {
        interpolated.push(toP);
      } else {
        // Smoothly interpolate X & Y coordinates
        const interpX = fromP.x + (toP.x - fromP.x) * t;
        const interpY = fromP.y + (toP.y - fromP.y) * t;

        // Shortest-arc angle lerp for aiming
        let diffAngle = toP.aimAngle - fromP.aimAngle;
        while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
        while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
        const interpAimAngle = fromP.aimAngle + diffAngle * t;

        interpolated.push({
          ...toP,
          x: interpX,
          y: interpY,
          aimAngle: interpAimAngle
        });
      }
    }

    return interpolated;
  }

  public async fetchRoomList(): Promise<RoomListItem[]> {
    try {
      const url = `${getBaseUrl()}/api/rooms`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const list = await res.json();
      return list || [];
    } catch (e) {
      console.warn('Failed to fetch rooms:', e);
      return [];
    }
  }
}

export const networkManager = new NetworkManager();
