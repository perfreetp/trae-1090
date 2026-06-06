import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Check, X, ArrowRight, RefreshCw, Award } from 'lucide-react';
import { useTournamentStore } from '../store';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { MatchResult } from '../types';
import { sortPlayersByRank } from '../utils/ranking';

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, players, matches, updateMatch, updateTournament, playerStats, calculateStats } = useTournamentStore();
  
  const tournament = tournaments.find(t => t.id === id);
  const tournamentPlayers = players.filter(p => p.tournamentId === id);
  const tournamentMatches = matches.filter(m => m.tournamentId === id);
  const currentRoundMatches = tournamentMatches.filter(m => m.round === tournament?.currentRound && m.tableNumber > 0);
  const allRoundMatches = tournamentMatches.filter(m => m.tableNumber > 0);

  const rankedPlayers = useMemo(() => {
    return sortPlayersByRank(tournamentPlayers, playerStats, tournament?.settings.showTiebreakers ?? true);
  }, [tournamentPlayers, playerStats, tournament]);

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

  const isFinalRound = useMemo(() => {
    if (!tournament) return false;
    if (tournament.format === 'single_elimination') {
      const activePlayers = tournamentPlayers.filter(p => p.status === 'active');
      const expectedRounds = Math.ceil(Math.log2(Math.max(activePlayers.length, 2)));
      return tournament.currentRound >= expectedRounds;
    }
    return tournament.currentRound >= tournament.totalRounds;
  }, [tournament, tournamentPlayers]);

  const canGenerateNext = useMemo(() => {
    if (!tournament || tournament.status === 'completed') return false;
    if (!allCompleted) return false;
    if (isFinalRound) return false;
    if (tournament.format === 'single_elimination') {
      const winners = currentRoundMatches.filter(m => m.completed).length;
      if (winners <= 1) return false;
    }
    return true;
  }, [tournament, allCompleted, isFinalRound, currentRoundMatches]);

  useEffect(() => {
    if (!tournament || !id) return;
    if (tournament.status === 'completed') return;
    
    if (allCompleted && isFinalRound) {
      updateTournament(id, { status: 'completed' });
    }
  }, [allCompleted, isFinalRound, tournament, id, updateTournament]);

  const completedRounds = useMemo(() => {
    if (!tournament) return [];
    const rounds: number[] = [];
    for (let r = 1; r < tournament.currentRound; r++) {
      rounds.push(r);
    }
    return rounds;
  }, [tournament]);

  if (!tournament) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-slate-400">赛事不存在</p>
        </CardContent>
      </Card>
    );
  }

  if (tournament.status === 'completed') {
    const champion = rankedPlayers[0];
    return (
      <div className="space-y-6">
        <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-amber-400 mb-2">赛事已结束</h2>
            {champion && (
              <div className="mt-6">
                <p className="text-xl text-slate-400 mb-2">恭喜冠军</p>
                <p className="text-4xl font-bold text-white">{champion.name}</p>
                <p className="text-lg text-slate-400 mt-2">
                  {champion.stats.wins}胜 {champion.stats.losses}负 · {champion.stats.points} 分
                </p>
              </div>
            )}
            <div className="mt-8 flex justify-center gap-4">
              <Button onClick={() => navigate(`/tournament/${id}/ranking`)}>
                <Award size={16} />
                查看完整排名
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/tournament/${id}/display`)}>
                <Trophy size={16} />
                投屏看板
              </Button>
            </div>
          </CardContent>
        </Card>

        {completedRounds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>历史比赛记录</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {completedRounds.map(round => {
                const roundMatches = tournamentMatches.filter(m => m.round === round);
                const normalMatches = roundMatches.filter(m => m.tableNumber > 0);
                const byeMatches = roundMatches.filter(m => m.tableNumber === 0);
                
                return (
                  <div key={round} className="space-y-3">
                    <h3 className="text-lg font-semibold text-amber-400">第 {round} 轮</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {normalMatches.map(match => (
                        <div key={match.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge variant="info" className="text-xs">第{match.tableNumber}桌</Badge>
                            <span className="text-white">{getPlayerName(match.player1Id)}</span>
                            {match.player1Result === 'win' && <Badge variant="success" className="text-xs">胜</Badge>}
                            {match.player1Result === 'forfeit' && <Badge variant="danger" className="text-xs">弃权</Badge>}
                          </div>
                          <span className="text-slate-500 font-medium">
                            {match.player1Games} : {match.player2Games}
                          </span>
                          <div className="flex items-center gap-2">
                            {match.player2Result === 'win' && <Badge variant="success" className="text-xs">胜</Badge>}
                            {match.player2Result === 'forfeit' && <Badge variant="danger" className="text-xs">弃权</Badge>}
                            <span className="text-white">{getPlayerName(match.player2Id)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {byeMatches.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {byeMatches.map(match => (
                          <Badge key={match.id} variant="info" className="text-sm">
                            🎫 {getPlayerName(match.player1Id)} 轮空晋级
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
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
            {isFinalRound && <span className="ml-2 text-amber-400">· 决赛轮</span>}
          </p>
        </div>
        {canGenerateNext && (
          <Button onClick={() => navigate(`/tournament/${id}/pairing`)}>
            生成下一轮
            <ArrowRight size={16} />
          </Button>
        )}
      </div>

      {completedRounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">历史轮次</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {completedRounds.map(round => {
                const roundMatches = tournamentMatches.filter(m => m.round === round && m.tableNumber > 0);
                const completedCount = roundMatches.filter(m => m.completed).length;
                return (
                  <Badge key={round} variant="info" className="text-sm py-1.5">
                    第 {round} 轮：{completedCount}/{roundMatches.length} 场
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
                <div className={`flex-1 rounded-lg p-4 ${match.player1Result === 'win' ? 'bg-emerald-500/10 border border-emerald-500/30' : match.player1Result === 'loss' || match.player1Result === 'forfeit' ? 'bg-red-500/10 border border-red-500/30' : match.player1Result === 'draw' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-700/30 border border-slate-600'}`}>
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

                <div className={`flex-1 rounded-lg p-4 ${match.player2Result === 'win' ? 'bg-emerald-500/10 border border-emerald-500/30' : match.player2Result === 'loss' || match.player2Result === 'forfeit' ? 'bg-red-500/10 border border-red-500/30' : match.player2Result === 'draw' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-700/30 border border-slate-600'}`}>
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
