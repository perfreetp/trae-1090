import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shuffle, RefreshCw, Printer, ArrowRight, AlertCircle, Edit2, Check, X, Trophy, Award } from 'lucide-react';
import { useTournamentStore } from '../store';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { generateSwissPairing, generateSingleElimination, generateRoundRobinRound, generateSingleEliminationNextRound } from '../utils/pairing';
import { printTableLabels } from '../utils/export';
import { Match } from '../types';
import { sortPlayersByRank } from '../utils/ranking';

export default function Pairing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, players, matches, setMatches, addMatches, updateMatch, updateTournament, playerStats, calculateStats } = useTournamentStore();
  
  const tournament = tournaments.find(t => t.id === id);
  const tournamentPlayers = players.filter(p => p.tournamentId === id);
  const activePlayers = tournamentPlayers.filter(p => p.status === 'active');
  const tournamentMatches = matches.filter(m => m.tournamentId === id);
  const currentRoundMatches = tournamentMatches.filter(m => m.round === tournament?.currentRound);
  const allRoundMatches = tournamentMatches;

  const rankedPlayers = useMemo(() => {
    return sortPlayersByRank(tournamentPlayers, playerStats, tournament?.settings.showTiebreakers ?? true);
  }, [tournamentPlayers, playerStats, tournament]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableNumber, setEditingTableNumber] = useState<number>(0);

  const isFinalRound = useMemo(() => {
    if (!tournament) return false;
    if (tournament.format === 'single_elimination') {
      const expectedRounds = Math.ceil(Math.log2(Math.max(activePlayers.length, 2)));
      return tournament.currentRound >= expectedRounds;
    }
    return tournament.currentRound >= tournament.totalRounds;
  }, [tournament, activePlayers]);

  const canGenerate = useMemo(() => {
    if (!tournament) return false;
    if (tournament.status === 'completed') return false;
    if (activePlayers.length < 2) return false;
    
    if (tournament.currentRound === 0) return true;
    
    if (isFinalRound) return false;
    
    if (tournament.format === 'single_elimination') {
      const prevMatches = tournamentMatches.filter(m => m.round === tournament.currentRound);
      if (prevMatches.length === 0) return false;
      const allCompleted = prevMatches.every(m => m.completed || m.player1Result === 'bye');
      if (!allCompleted) return false;
      const winners = prevMatches.filter(m => m.player1Result === 'bye' || m.completed).length;
      if (winners <= 1) return false;
    } else {
      if (currentRoundMatches.some(m => !m.completed && m.tableNumber > 0)) {
        return false;
      }
    }
    
    return true;
  }, [tournament, activePlayers, currentRoundMatches, tournamentMatches, isFinalRound, id]);

  const completedRounds = useMemo(() => {
    if (!tournament) return [];
    const rounds: number[] = [];
    for (let r = 1; r < tournament.currentRound; r++) {
      rounds.push(r);
    }
    return rounds;
  }, [tournament]);

  const handleGeneratePairing = () => {
    if (!tournament || !canGenerate || !id) return;
    
    setIsGenerating(true);
    
    setTimeout(() => {
      const nextRound = tournament.currentRound + 1;
      let newMatches: Match[] = [];

      switch (tournament.format) {
        case 'swiss':
          newMatches = generateSwissPairing(
            tournamentPlayers,
            playerStats,
            id,
            nextRound,
            tournament.settings.avoidRepeatMatches
          );
          break;
        case 'single_elimination':
          if (tournament.currentRound === 0) {
            newMatches = generateSingleElimination(tournamentPlayers, id);
          } else {
            const prevMatches = tournamentMatches.filter(m => m.round === tournament.currentRound);
            newMatches = generateSingleEliminationNextRound(prevMatches, id, nextRound);
          }
          break;
        case 'round_robin':
          newMatches = generateRoundRobinRound(tournamentPlayers, id, nextRound);
          break;
      }

      if (newMatches.length > 0) {
        addMatches(newMatches);
        updateTournament(id, { currentRound: nextRound });
        calculateStats();
      }
      
      setIsGenerating(false);
    }, 500);
  };

  const handleRegenerate = () => {
    if (!tournament || !id) return;
    if (!confirm('确定要重新生成本轮配对吗？当前配对将会被覆盖。')) return;
    
    const filteredMatches = allRoundMatches.filter(m => m.round !== tournament.currentRound);
    setMatches(filteredMatches);
    
    setTimeout(() => {
      let newMatches: Match[] = [];
      const round = tournament.currentRound;

      switch (tournament.format) {
        case 'swiss':
          newMatches = generateSwissPairing(
            tournamentPlayers,
            playerStats,
            id,
            round,
            tournament.settings.avoidRepeatMatches
          );
          break;
        case 'single_elimination':
          if (round === 1) {
            newMatches = generateSingleElimination(tournamentPlayers, id);
          } else {
            const prevMatches = tournamentMatches.filter(m => m.round === round - 1);
            newMatches = generateSingleEliminationNextRound(prevMatches, id, round);
          }
          break;
        case 'round_robin':
          newMatches = generateRoundRobinRound(tournamentPlayers, id, round);
          break;
      }

      if (newMatches.length > 0) {
        addMatches(newMatches);
        calculateStats();
      }
    }, 100);
  };

  const handlePrintLabels = () => {
    if (!tournament) return;
    printTableLabels(allRoundMatches, tournamentPlayers, tournament.currentRound);
  };

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return '轮空';
    const player = tournamentPlayers.find(p => p.id === playerId);
    return player?.name || '未知选手';
  };

  const handleStartEditTable = (match: Match) => {
    setEditingTableId(match.id);
    setEditingTableNumber(match.tableNumber);
  };

  const handleSaveTableNumber = (matchId: string) => {
    if (editingTableNumber >= 0) {
      updateMatch(matchId, { tableNumber: editingTableNumber });
    }
    setEditingTableId(null);
  };

  const handleCancelEditTable = () => {
    setEditingTableId(null);
  };

  const normalMatches = currentRoundMatches.filter(m => m.tableNumber > 0);
  const byeMatches = currentRoundMatches.filter(m => m.tableNumber === 0);

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
              <Button onClick={() => navigate(`/tournament/${id}/results`)}>
                <Award size={16} />
                查看比赛记录
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/tournament/${id}/ranking`)}>
                <Trophy size={16} />
                完整排名
              </Button>
            </div>
          </CardContent>
        </Card>

        {completedRounds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>历史对阵记录</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {completedRounds.map(round => {
                const roundMatches = tournamentMatches.filter(m => m.round === round);
                const roundNormalMatches = roundMatches.filter(m => m.tableNumber > 0);
                const roundByeMatches = roundMatches.filter(m => m.tableNumber === 0);
                
                return (
                  <div key={round} className="space-y-3">
                    <h3 className="text-lg font-semibold text-amber-400">第 {round} 轮</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {roundNormalMatches.map(match => (
                        <div key={match.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge variant="info" className="text-xs">第{match.tableNumber}桌</Badge>
                            <span className="text-white">{getPlayerName(match.player1Id)}</span>
                          </div>
                          <span className="text-slate-500 font-medium">
                            {match.player1Games} : {match.player2Games}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-white">{getPlayerName(match.player2Id)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {roundByeMatches.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {roundByeMatches.map(match => (
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">分组配对</h1>
          <p className="text-slate-400 mt-1">
            第 {tournament.currentRound}/{tournament.totalRounds} 轮 · 
            {activePlayers.length} 名选手参赛
            {isFinalRound && tournament.currentRound > 0 && <span className="ml-2 text-amber-400">· 决赛轮</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {currentRoundMatches.length > 0 && !isFinalRound && (
            <>
              <Button variant="secondary" onClick={handleRegenerate}>
                <RefreshCw size={16} />
                重新配对
              </Button>
              <Button variant="secondary" onClick={handlePrintLabels}>
                <Printer size={16} />
                打印桌签
              </Button>
            </>
          )}
          {canGenerate && (
            <Button onClick={handleGeneratePairing} disabled={isGenerating}>
              <Shuffle size={16} className={isGenerating ? 'animate-spin' : ''} />
              {tournament.currentRound === 0 ? '生成第一轮' : '生成下一轮'}
            </Button>
          )}
        </div>
      </div>

      {completedRounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">历史轮次</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {completedRounds.map(round => {
                const roundMatches = tournamentMatches.filter(m => m.round === round);
                const completedCount = roundMatches.filter(m => m.completed || m.player1Result === 'bye').length;
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

      {tournament.currentRound === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-4">
              <Shuffle className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">准备开始配对</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              {activePlayers.length < 2 
                ? '请先在选手报名页面添加至少2名可参赛选手'
                : `系统将使用${tournament.format === 'swiss' ? '瑞士轮' : tournament.format === 'single_elimination' ? '单败淘汰' : '循环赛'}算法进行配对`
              }
            </p>
            {activePlayers.length >= 2 && (
              <Button onClick={handleGeneratePairing} disabled={isGenerating} size="lg">
                <Shuffle size={18} className={isGenerating ? 'animate-spin' : ''} />
                生成第一轮配对
              </Button>
            )}
          </CardContent>
        </Card>
      ) : currentRoundMatches.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">本轮暂无配对</h3>
            <p className="text-slate-400">点击上方按钮生成对阵</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {normalMatches.map(match => (
              <Card key={match.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    {editingTableId === match.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={editingTableNumber}
                          onChange={(e) => setEditingTableNumber(parseInt(e.target.value) || 1)}
                          className="w-20 px-2 py-1 text-center bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveTableNumber(match.id)}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={handleCancelEditTable}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="info">第 {match.tableNumber} 桌</Badge>
                        <button
                          onClick={() => handleStartEditTable(match)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                          title="修改桌号"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                    {match.completed && <Badge variant="success">已完成</Badge>}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-center">
                      <p className="font-medium text-white">{getPlayerName(match.player1Id)}</p>
                    </div>
                    <div className="px-4 text-slate-500 font-bold">VS</div>
                    <div className="flex-1 text-center">
                      <p className="font-medium text-white">{getPlayerName(match.player2Id)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {byeMatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">轮空选手</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {byeMatches.map(match => (
                    <Badge key={match.id} variant="info" className="text-sm py-1.5">
                      🎫 {getPlayerName(match.player1Id)} 轮空晋级
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">下一步：成绩录入</h3>
                <p className="text-sm text-slate-400">录入本轮比赛结果</p>
              </div>
              <Button onClick={() => navigate(`/tournament/${id}/results`)}>
                录入成绩
                <ArrowRight size={16} />
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
