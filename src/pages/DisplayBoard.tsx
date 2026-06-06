import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Maximize2, Minimize2, Play, Pause, RefreshCw } from 'lucide-react';
import { useTournamentStore } from '../store';
import { sortPlayersByRank } from '../utils/ranking';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

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
              第 {tournament.currentRound}/{tournament.totalRounds} 轮
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

        {currentRoundMatches.length > 0 && displayMatch && (
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
                </div>
                <div className="text-4xl font-bold text-slate-600 px-8">VS</div>
                <div className="text-center flex-1">
                  <p className="text-4xl font-bold text-white mb-2">
                    {getPlayerName(displayMatch.player2Id)}
                  </p>
                  <p className="text-6xl font-bold text-amber-400">
                    {displayMatch.player2Games}
                  </p>
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

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">本轮对阵</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
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
        </div>
      </div>
    </div>
  );
}
