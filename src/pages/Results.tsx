import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Check, X, ArrowRight, RefreshCw } from 'lucide-react';
import { useTournamentStore } from '../store';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { MatchResult } from '../types';

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, players, matches, updateMatch, playerStats, calculateStats } = useTournamentStore();
  
  const tournament = tournaments.find(t => t.id === id);
  const tournamentPlayers = players.filter(p => p.tournamentId === id);
  const currentRoundMatches = matches.filter(m => m.tournamentId === id && m.round === tournament?.currentRound && m.tableNumber > 0);

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return '轮空';
    const player = tournamentPlayers.find(p => p.id === playerId);
    return player?.name || '未知选手';
  };

  const handleSetResult = (matchId: string, player1Result: MatchResult, player2Result: MatchResult) => {
    updateMatch(matchId, {
      player1Result,
      player2Result,
      completed: player1Result !== null && player2Result !== null
    });
  };

  const handleSetGames = (matchId: string, player1Games: number, player2Games: number) => {
    updateMatch(matchId, {
      player1Games,
      player2Games
    });
  };

  const handleSetWin = (matchId: string, winner: 1 | 2) => {
    if (winner === 1) {
      handleSetResult(matchId, 'win', 'loss');
    } else {
      handleSetResult(matchId, 'loss', 'win');
    }
  };

  const handleSetDraw = (matchId: string) => {
    handleSetResult(matchId, 'draw', 'draw');
  };

  const handleSetForfeit = (matchId: string, player: 1 | 2) => {
    if (player === 1) {
      handleSetResult(matchId, 'forfeit', 'win');
    } else {
      handleSetResult(matchId, 'win', 'forfeit');
    }
  };

  const handleResetMatch = (matchId: string) => {
    updateMatch(matchId, {
      player1Result: null,
      player2Result: null,
      player1Games: 0,
      player2Games: 0,
      completed: false
    });
  };

  const allCompleted = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.completed);
  const completedCount = currentRoundMatches.filter(m => m.completed).length;

  if (!tournament) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-slate-400">赛事不存在</p>
        </CardContent>
      </Card>
    );
  }

  if (currentRoundMatches.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-16">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">暂无比赛可录入</h3>
          <p className="text-slate-400 mb-6">请先在分组配对页面生成对阵</p>
          <Button onClick={() => navigate(`/tournament/${id}/pairing`)}>
            去配对
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">成绩录入</h1>
          <p className="text-slate-400 mt-1">
            第 {tournament.currentRound}/{tournament.totalRounds} 轮 · 
            已完成 {completedCount}/{currentRoundMatches.length} 场
          </p>
        </div>
        {allCompleted && tournament.currentRound < tournament.totalRounds && (
          <Button onClick={() => navigate(`/tournament/${id}/pairing`)}>
            生成下一轮
            <ArrowRight size={16} />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {currentRoundMatches.map(match => (
          <Card key={match.id} className={match.completed ? 'border-emerald-500/30' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="info">第 {match.tableNumber} 桌</Badge>
                  {match.completed && <Badge variant="success">已完成</Badge>}
                </div>
                <button
                  onClick={() => handleResetMatch(match.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                  title="重置比赛"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              <div className="flex items-stretch gap-4">
                <div className={`flex-1 rounded-lg p-4 ${match.player1Result === 'win' ? 'bg-emerald-500/10 border border-emerald-500/30' : match.player1Result === 'loss' ? 'bg-red-500/10 border border-red-500/30' : match.player1Result === 'draw' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-700/30 border border-slate-600'}`}>
                  <p className="font-medium text-white text-center mb-3">{getPlayerName(match.player1Id)}</p>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <input
                      type="number"
                      min={0}
                      value={match.player1Games}
                      onChange={(e) => handleSetGames(match.id, parseInt(e.target.value) || 0, match.player2Games)}
                      className="w-16 px-2 py-1.5 text-center bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => handleSetWin(match.id, 1)}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${match.player1Result === 'win' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      胜
                    </button>
                    <button
                      onClick={() => handleSetDraw(match.id)}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${match.player1Result === 'draw' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      平
                    </button>
                    <button
                      onClick={() => handleSetForfeit(match.id, 2)}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${match.player1Result === 'forfeit' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      弃权
                    </button>
                  </div>
                </div>

                <div className="flex items-center px-2">
                  <span className="text-2xl font-bold text-slate-500">VS</span>
                </div>

                <div className={`flex-1 rounded-lg p-4 ${match.player2Result === 'win' ? 'bg-emerald-500/10 border border-emerald-500/30' : match.player2Result === 'loss' ? 'bg-red-500/10 border border-red-500/30' : match.player2Result === 'draw' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-700/30 border border-slate-600'}`}>
                  <p className="font-medium text-white text-center mb-3">{getPlayerName(match.player2Id)}</p>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <input
                      type="number"
                      min={0}
                      value={match.player2Games}
                      onChange={(e) => handleSetGames(match.id, match.player1Games, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1.5 text-center bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => handleSetWin(match.id, 2)}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${match.player2Result === 'win' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      胜
                    </button>
                    <button
                      onClick={() => handleSetDraw(match.id)}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${match.player2Result === 'draw' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      平
                    </button>
                    <button
                      onClick={() => handleSetForfeit(match.id, 1)}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${match.player2Result === 'forfeit' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      弃权
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-white mb-1">查看排名</h3>
            <p className="text-sm text-slate-400">查看实时排名和选手数据</p>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/tournament/${id}/ranking`)}>
            排名榜
            <ArrowRight size={16} />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
