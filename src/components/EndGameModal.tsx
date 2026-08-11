import React from 'react';
import { EndMatchStats, Player } from '../types';
import { Trophy, RefreshCw, LogOut, Crown, Award, Zap } from 'lucide-react';

interface Props {
  stats: EndMatchStats;
  onPlayAgain: () => void;
  onExit: () => void;
}

export const calcPlayerScore = (p: Player): number => {
  const killScore = (p.kills || 0) * 100;
  const headshotBonus = (p.headshots || 0) * 50;
  const damageBonus = Math.round((p.damageDealt || 0) * 0.1);
  const suicidePenalty = (p.suicides || 0) * 50;
  return Math.max(0, killScore + headshotBonus + damageBonus - suicidePenalty);
};

export const EndGameModal: React.FC<Props> = ({ stats, onPlayAgain, onExit }) => {
  // Sort players by Kills (most kills wins!), tie-break by total Score
  const sortedPlayers = [...stats.players].sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    return calcPlayerScore(b) - calcPlayerScore(a);
  });

  const winner = sortedPlayers[0];
  const isHumanWinner = winner && !winner.isBot;
  const winnerScore = winner ? calcPlayerScore(winner) : 0;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-yellow-500/60 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl text-white font-sans">
        
        {/* Victory / Winner Header Banner */}
        <div className={`p-6 text-center border-b-2 border-white/10 relative ${isHumanWinner ? 'bg-gradient-to-b from-yellow-950 via-amber-900/80 to-slate-900' : 'bg-gradient-to-b from-red-950 via-slate-900 to-slate-900'}`}>
          <div className="inline-flex items-center gap-2 bg-yellow-500 text-black font-black uppercase text-xs px-4 py-1 rounded-full mb-3 tracking-widest shadow-lg animate-bounce">
            <Crown className="w-4 h-4 fill-current" /> BATTLE ROYALE CHAMPIONSHIP
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-black text-yellow-400 tracking-wider italic uppercase drop-shadow-md">
            {isHumanWinner ? '🍗 WINNER WINNER CHICKEN DINNER!' : `🏆 WINNER: ${winner?.name?.toUpperCase() || 'UNKNOWN'}`}
          </h2>
          
          {winner && (
            <div className="mt-3 inline-flex items-center gap-4 bg-black/60 px-5 py-2 rounded-xl border border-yellow-500/40 text-xs font-mono">
              <span className="text-gray-300">MOST KILLS WINNER:</span>
              <span className="text-red-400 font-extrabold text-sm">{winner.kills} KILLS</span>
              <span className="text-gray-500">|</span>
              <span className="text-yellow-400 font-extrabold text-sm">SCORE: {winnerScore} PTS</span>
            </div>
          )}
        </div>

        {/* Scoreboard Table */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          <div className="grid grid-cols-12 text-[10px] font-black text-yellow-400 uppercase tracking-widest border-b border-white/10 pb-2 px-3">
            <div className="col-span-4">SOLDIER</div>
            <div className="col-span-2 text-center">KILLS</div>
            <div className="col-span-2 text-center">DEATHS</div>
            <div className="col-span-2 text-center">DAMAGE</div>
            <div className="col-span-2 text-right">TOTAL SCORE</div>
          </div>

          {sortedPlayers.map((p, idx) => {
            const pScore = calcPlayerScore(p);
            const isWinner = idx === 0;

            return (
              <div
                key={p.id}
                className={`grid grid-cols-12 items-center p-3 rounded-xl border-2 transition ${
                  isWinner
                    ? 'bg-yellow-950/70 border-yellow-400 text-white font-bold shadow-lg ring-1 ring-yellow-400/50'
                    : 'bg-black/40 border-white/10 text-gray-200'
                }`}
              >
                <div className="col-span-4 flex items-center gap-2">
                  <span className={`font-black text-xs w-6 font-mono ${isWinner ? 'text-yellow-400 text-sm' : 'text-gray-400'}`}>
                    {isWinner ? '👑 #1' : `#${idx + 1}`}
                  </span>
                  <span className="font-black text-sm uppercase truncate">{p.name}</span>
                  {p.isBot && (
                    <span className="text-[8px] bg-red-950 text-red-300 border border-red-800 px-1 py-0.5 rounded font-extrabold uppercase">
                      BOT
                    </span>
                  )}
                </div>

                <div className="col-span-2 text-center font-black text-red-400 text-base font-mono">
                  {p.kills}
                </div>

                <div className="col-span-2 text-center font-bold text-gray-400 text-sm font-mono">
                  {p.deaths}
                </div>

                <div className="col-span-2 text-center font-mono text-xs text-gray-300">
                  {Math.round(p.damageDealt)} HP
                </div>

                <div className="col-span-2 text-right font-mono text-sm font-black text-yellow-400">
                  {pScore} <span className="text-[9px] text-yellow-500/80 font-normal">pts</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-950 border-t-2 border-white/10 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition shadow-lg"
          >
            <RefreshCw className="w-4 h-4" /> PLAY AGAIN
          </button>

          <button
            onClick={onExit}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition border-2 border-white/20"
          >
            <LogOut className="w-4 h-4" /> MAIN MENU
          </button>
        </div>

      </div>
    </div>
  );
};


