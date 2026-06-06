import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Medal, Search, User, ArrowRight } from 'lucide-react';
import { useTournamentStore } from '../store';
import { sortPlayersByRank, getPlayerMatches } from '../utils/ranking';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

export default function Ranking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, players, matches, playerStats } = useTournamentStore();
  
  const tournament = tournaments.find(t => t.id === id);
  const tournamentPlayers = players.filter(p => p.tournamentId === id);
  const tournamentMatches = matches.filter(m => m.tournamentId === id);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const rankedPlayers = useMemo(() => {
    return sortPlayersByRank(
      tournamentPlayers,
      playerStats,
      tournament?.settings.showTiebreakers ?? true
    );
  }, [tournamentPlayers, playerStats, tournament]);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return rankedPlayers;
    return rankedPlayers.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rankedPlayers, searchQuery]);

  const selectedPlayerData = selectedPlayer 
    ? rankedPlayers.find(p => p.id === selectedPlayer) 
    : null;
  
  const playerMatches = selectedPlayer 
    ? getPlayerMatches(selectedPlayer, tournamentMatches, tournamentPlayers)
    : [];

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge variant="warning" className="text-sm px-3 py-1">🥇 第1名</Badge>;
    if (rank === 2) return <Badge variant="default" className="text-sm px-3 py-1">🥈 第2名</Badge>;
    if (rank === 3) return <Badge variant="info" className="text-sm px-3 py-1">🥉 第3名</Badge>;
    return <span className="text-slate-400 font-medium">第 {rank} 名</span>;
  };

  const getResultBadge = (result: string | undefined) => {
    const config: Record<string, { variant: 'success' | 'danger' | 'warning' | 'info' | 'default'; label: string }> = {
      win: { variant: 'success', label: '胜' },
      loss: { variant: 'danger', label: '负' },
      draw: { variant: 'warning', label: '平' },
      bye: { variant: 'info', label: '轮空' },
      forfeit: { variant: 'danger', label: '弃权' }
    };
    if (!result) return <Badge variant="default">-</Badge>;
    const { variant, label } = config[result] || { variant: 'default', label: result };
    return <Badge variant={variant}>{label}</Badge>;
  };

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
          <h1 className="text-2xl font-bold text-white">排名榜</h1>
          <p className="text-slate-400 mt-1">
            第 {tournament.currentRound}/{tournament.totalRounds} 轮 · 
            共 {tournamentPlayers.length} 名选手
          </p>
        </div>
        <Button onClick={() => navigate(`/tournament/${id}/display`)}>
          投屏看板
          <ArrowRight size={16} />
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {rankedPlayers.slice(0, 3).map((player, index) => (
          <Card key={player.id} className={index === 0 ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-transparent' : ''}>
            <CardContent className="text-center py-6">
              <div className="text-4xl mb-3">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{player.name}</h3>
              <div className="text-3xl font-bold text-amber-400 mb-2">
                {player.stats.points} <span className="text-lg text-slate-500">分</span>
              </div>
              <p className="text-sm text-slate-400">
                {player.stats.wins}胜 {player.stats.losses}负 {player.stats.draws}平
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex justify-between items-center">
            <Input
              placeholder="搜索选手..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
              icon={<Search size={16} />}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">排名</TableHead>
                <TableHead>选手</TableHead>
                <TableHead className="text-center">积分</TableHead>
                <TableHead className="text-center">胜</TableHead>
                <TableHead className="text-center">负</TableHead>
                <TableHead className="text-center">平</TableHead>
                <TableHead className="text-center">轮空</TableHead>
                <TableHead className="text-center">弃权</TableHead>
                {tournament.settings.showTiebreakers && (
                  <>
                    <TableHead className="text-center">对手胜率</TableHead>
                    <TableHead className="text-center">游戏胜率</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map((player) => (
                <TableRow 
                  key={player.id} 
                  className="cursor-pointer"
                  onClick={() => setSelectedPlayer(player.id)}
                >
                  <TableCell>
                    {getRankBadge(player.rank || 0)}
                  </TableCell>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell className="text-center font-bold text-amber-400">{player.stats.points}</TableCell>
                  <TableCell className="text-center text-emerald-400">{player.stats.wins}</TableCell>
                  <TableCell className="text-center text-red-400">{player.stats.losses}</TableCell>
                  <TableCell className="text-center text-amber-400">{player.stats.draws}</TableCell>
                  <TableCell className="text-center text-blue-400">{player.stats.byes}</TableCell>
                  <TableCell className="text-center text-orange-400">{player.stats.forfeits}</TableCell>
                  {tournament.settings.showTiebreakers && (
                    <>
                      <TableCell className="text-center">
                        {(player.stats.tiebreakers.opponentWinRate * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {(player.stats.tiebreakers.gameWinRate * 100).toFixed(1)}%
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        title={selectedPlayerData?.name || '选手详情'}
        size="lg"
      >
        {selectedPlayerData && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <User className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedPlayerData.name}</h3>
                <p className="text-sm text-slate-400">
                  {getRankBadge(selectedPlayerData.rank || 0)}
                </p>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-bold text-amber-400">{selectedPlayerData.stats.points} 分</div>
                <p className="text-sm text-slate-400">
                  {selectedPlayerData.stats.wins}胜 {selectedPlayerData.stats.losses}负 {selectedPlayerData.stats.draws}平
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-3">比赛记录</h4>
              <div className="space-y-2">
                {playerMatches.length === 0 ? (
                  <p className="text-center py-4 text-slate-500">暂无比赛记录</p>
                ) : (
                  playerMatches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="info">第{match.round}轮</Badge>
                        {match.tableNumber > 0 && <span className="text-sm text-slate-400">第{match.tableNumber}桌</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-300">
                          VS {match.opponent?.name || '轮空'}
                        </span>
                        <span className="text-sm text-slate-500">
                          {match.player1Id === selectedPlayer ? match.player1Games : match.player2Games}
                          {' : '}
                          {match.player1Id === selectedPlayer ? match.player2Games : match.player1Games}
                        </span>
                        {getResultBadge(match.result)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
