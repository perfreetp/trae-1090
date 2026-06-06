import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shuffle, RefreshCw, Printer, ArrowRight, AlertCircle } from 'lucide-react';
import { useTournamentStore } from '../store';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { generateSwissPairing, generateSingleElimination, generateRoundRobin } from '../utils/pairing';
import { printTableLabels } from '../utils/export';
import { Match } from '../types';

export default function Pairing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, players, matches, setMatches, addMatches, updateTournament, playerStats, calculateStats } = useTournamentStore();
  
  const tournament = tournaments.find(t => t.id === id);
  const tournamentPlayers = players.filter(p => p.tournamentId === id);
  const activePlayers = tournamentPlayers.filter(p => p.status === 'active');
  const currentRoundMatches = matches.filter(m => m.tournamentId === id && m.round === tournament?.currentRound);
  const allRoundMatches = matches.filter(m => m.tournamentId === id);

  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate = useMemo(() => {
    if (!tournament) return false;
    if (activePlayers.length < 2) return false;
    if (tournament.currentRound > 0 && currentRoundMatches.some(m => !m.completed && m.tableNumber > 0)) {
      return false;
    }
    if (tournament.currentRound >= tournament.totalRounds) return false;
    return true;
  }, [tournament, activePlayers, currentRoundMatches]);

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
          }
          break;
        case 'round_robin':
          if (tournament.currentRound === 0) {
            const allMatches = generateRoundRobin(tournamentPlayers, id, tournament.totalRounds);
            newMatches = allMatches[0] || [];
          }
          break;
      }

      if (newMatches.length > 0) {
        if (tournament.currentRound === 0) {
          setMatches(newMatches);
        } else {
          addMatches(newMatches);
        }
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
    handleGeneratePairing();
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">分组配对</h1>
          <p className="text-slate-400 mt-1">
            第 {tournament.currentRound}/{tournament.totalRounds} 轮 · 
            {activePlayers.length} 名选手参赛
          </p>
        </div>
        <div className="flex gap-2">
          {currentRoundMatches.length > 0 && (
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
                    <Badge variant="info">第 {match.tableNumber} 桌</Badge>
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
                      {getPlayerName(match.player1Id)}
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
