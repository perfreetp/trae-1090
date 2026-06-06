import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Maximize2, Minimize2, Play, Pause, RefreshCw, Trophy, Medal } from 'lucide-react';
import { useTournamentStore } from '../store';
import { sortPlayersByRank } from '../utils/ranking';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function DisplayBoard() {
  const { id } = useParams<{ id: string }>();
  const { tournaments, players, matches, playerStats } = useTournamentStore();
  
  const tournament = tournaments.find(t => t.id === id);
  const tournamentPlayers = players.filter(p => p.tournamentId === id);
  const tournamentMatches = matches.filter(m => m.tournamentId === id);
  const currentRoundMatches = tournamentMatches.filter(m => m.round === tournament?.currentRound && m.tableNumber > 0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const rankedPlayers = useMemo(() => {
    return sortPlayersByRank(tournamentPlayers, playerStats, true);
  }, [tournamentPlayers, playerStats]);

  const allRounds = useMemo(() => {
    if (!tournament) return [];
    const rounds: number[] = [];
    for (let r = 1; r <= tournament.currentRound; r++) {
      rounds.push(r);
    }
    return rounds;
  }, [tournament]);

  const champion = useMemo(() => {
    if (!tournament || tournament.status !== 'completed') return null;
    if (tournament.format === 'single_elimination' && rankedPlayers.length > 0) {
      return rankedPlayers[0];
    }
    return null;
  }, [tournament, rankedPlayers]);

  useEffect(() => {
    if (!autoScroll || currentRoundMatches.length === 0) return;

    const interval = setInterval(() => {
      setCurrentMatchIndex(prev => (prev + 1) % currentRoundMatches.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoScroll, currentRoundMatches.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return '轮空';
    const player = tournamentPlayers.find(p => p.id === playerId);
    return player?.name || '未知选手';
  };

  const getResultBadge = (result: string | null) => {
    const config: Record<string, { className: string; label: string }> = {
      win: { className: 'bg-emerald-500/20 text-emerald-400', label: '胜' },
      loss: { className: 'bg-red-500/20 text-red-400', label: '负' },
      draw: { className: 'bg-amber-500/20 text-amber-400', label: '平' },
      bye: { className: 'bg-blue-500/20 text-blue-400', label: '轮空' },
      forfeit: { className: 'bg-orange-500/20 text-orange-400', label: '弃权' }
    };
    if (!result) return null;
    const { className, label } = config[result] || { className: 'bg-slate-500/20 text-slate-400', label: result };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${className}`}>{label}</span>;
  };

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">赛事不存在</p>
      </div>
    );
  }

  const displayMatch = currentRoundMatches[currentMatchIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{tournament.name}</h1>
            <p className="text-xl text-amber-400">
              {tournament.status === 'completed' ? (
                <span className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  赛事已结束
                </span>
              ) : (
                `第 ${tournament.currentRound}/${tournament.totalRounds} 轮`
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={autoScroll ? 'primary' : 'secondary'}
              onClick={() => setAutoScroll(!autoScroll)}
              size="sm"
            >
              {autoScroll ? <Pause size={16} /> : <Play size={16} />}
              {autoScroll ? '暂停' : '播放'}
            </Button>
            <Button variant="secondary" onClick={toggleFullscreen} size="sm">
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              {isFullscreen ? '退出全屏' : '全屏'}
            </Button>
          </div>
        </div>

        {champion && (
          <Card className="mb-8 overflow-hidden border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-bold text-amber-400 mb-2">恭喜冠军</h2>
              <p className="text-4xl font-bold text-white">{champion.name}</p>
              <p className="text-xl text-slate-400 mt-2">
                {champion.stats.wins}胜 {champion.stats.losses}负 · {champion.stats.points} 分
              </p>
            </CardContent>
          </Card>
        )}

        {currentRoundMatches.length > 0 && displayMatch && tournament.status !== 'completed' && (
          <Card className="mb-8 overflow-hidden">
            <CardContent className="p-8 bg-gradient-to-r from-slate-800/50 via-slate-700/30 to-slate-800/50">
              <div className="text-center mb-6">
                <span className="inline-block px-6 py-2 bg-amber-500/20 text-amber-400 rounded-full text-xl font-bold">
                  第 {displayMatch.tableNumber} 桌
                </span>
              </div>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center flex-1">
                  <p className="text-4xl font-bold text-white mb-2">
                    {getPlayerName(displayMatch.player1Id)}
                  </p>
                  <p className="text-6xl font-bold text-amber-400">
                    {displayMatch.player1Games}
                  </p>
                  {getResultBadge(displayMatch.player1Result)}
                </div>
                <div className="text-4xl font-bold text-slate-600 px-8">VS</div>
                <div className="text-center flex-1">
                  <p className="text-4xl font-bold text-white mb-2">
                    {getPlayerName(displayMatch.player2Id)}
                  </p>
                  <p className="text-6xl font-bold text-amber-400">
                    {displayMatch.player2Games}
                  </p>
                  {getResultBadge(displayMatch.player2Result)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">实时排名</h2>
              <div className="space-y-3">
                {rankedPlayers.slice(0, 10).map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                      index < 3 ? 'bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30' : 'bg-slate-800/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-amber-500 text-slate-900' :
                      index === 1 ? 'bg-slate-400 text-slate-900' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-white">{player.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-amber-400">{player.stats.points}</p>
                      <p className="text-sm text-slate-400">
                        {player.stats.wins}胜 {player.stats.losses}负
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {tournament.status !== 'completed' && currentRoundMatches.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-white mb-6 text-center">本轮对阵</h2>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {currentRoundMatches.map((match, index) => (
                      <div
                        key={match.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
                          index === currentMatchIndex 
                            ? 'bg-amber-500/20 border border-amber-500/50' 
                            : 'bg-slate-800/50 hover:bg-slate-700/50'
                        }`}
                        onClick={() => setCurrentMatchIndex(index)}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded text-sm font-medium ${
                            match.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'
                          }`}>
                            第{match.tableNumber}桌
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium">{getPlayerName(match.player1Id)}</span>
                          <span className="text-slate-500 font-bold">
                            {match.player1Games} : {match.player2Games}
                          </span>
                          <span className="text-white font-medium">{getPlayerName(match.player2Id)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {allRounds.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-white mb-6 text-center">淘汰赛记录</h2>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {allRounds.map(round => {
                      const roundMatches = tournamentMatches.filter(m => m.round === round);
                      const normalMatches = roundMatches.filter(m => m.tableNumber > 0);
                      const byeMatches = roundMatches.filter(m => m.tableNumber === 0);
                      
                      return (
                        <div key={round} className="space-y-2">
                          <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                            <Medal size={18} />
                            第 {round} 轮
                            {round === tournament.currentRound && tournament.status !== 'completed' && (
                              <Badge variant="info" className="text-xs">进行中</Badge>
                            )}
                            {round < tournament.currentRound && (
                              <Badge variant="success" className="text-xs">已完成</Badge>
                            )}
                          </h3>
                          
                          {normalMatches.length > 0 && (
                            <div className="space-y-1 pl-4">
                              {normalMatches.map(match => (
                                <div key={match.id} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 w-12">第{match.tableNumber}桌</span>
                                    <span className="text-white text-sm">{getPlayerName(match.player1Id)}</span>
                                    {getResultBadge(match.player1Result)}
                                  </div>
                                  <span className="text-slate-500 text-sm font-medium">
                                    {match.player1Games} : {match.player2Games}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {getResultBadge(match.player2Result)}
                                    <span className="text-white text-sm">{getPlayerName(match.player2Id)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {byeMatches.length > 0 && (
                            <div className="pl-4">
                              <div className="flex flex-wrap gap-2">
                                {byeMatches.map(match => (
                                  <span key={match.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                                    🎫 {getPlayerName(match.player1Id)} 轮空晋级
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
