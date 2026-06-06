import { Tournament, Player, PlayerStats, Match, PlayerWithStats } from '../types';

const toCSV = (rows: (string | number)[][]): string => {
  return rows
    .map(row =>
      row
        .map(cell => {
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');
};

export const exportRankingToCSV = (
  tournament: Tournament,
  rankedPlayers: PlayerWithStats[]
): string => {
  const header = ['排名', '选手名称', '积分', '胜', '负', '平', '轮空', '胜局', '负局', '对手胜率', '游戏胜率'];
  
  const rows = rankedPlayers.map(player => [
    player.rank || 0,
    player.name,
    player.stats.points,
    player.stats.wins,
    player.stats.losses,
    player.stats.draws,
    player.stats.byes,
    player.stats.gameWinCount,
    player.stats.gameLossCount,
    (player.stats.tiebreakers.opponentWinRate * 100).toFixed(2) + '%',
    (player.stats.tiebreakers.gameWinRate * 100).toFixed(2) + '%'
  ]);

  return `赛事名称: ${tournament.name}\n赛制: ${getFormatName(tournament.format)}\n当前轮次: ${tournament.currentRound}/${tournament.totalRounds}\n\n` + toCSV([header, ...rows]);
};

export const exportMatchesToCSV = (
  tournament: Tournament,
  matches: Match[],
  players: Player[]
): string => {
  const playerMap = new Map(players.map(p => [p.id, p]));
  const header = ['轮次', '桌号', '选手1', '选手2', '选手1结果', '选手2结果', '选手1小分', '选手2小分', '状态'];

  const rows = matches.map(match => [
    match.round,
    match.tableNumber === 0 ? '轮空' : match.tableNumber,
    match.player1Id ? playerMap.get(match.player1Id)?.name || '' : '',
    match.player2Id ? playerMap.get(match.player2Id)?.name || '' : '',
    getResultName(match.player1Result),
    getResultName(match.player2Result),
    match.player1Games,
    match.player2Games,
    match.completed ? '已完成' : '进行中'
  ]);

  return `赛事名称: ${tournament.name}\n赛制: ${getFormatName(tournament.format)}\n\n` + toCSV([header, ...rows]);
};

export const exportPlayersToCSV = (players: Player[]): string => {
  const header = ['选手名称', '种子序号', '状态'];
  const rows = players.map(player => [
    player.name,
    player.seed || '',
    getStatusName(player.status)
  ]);
  return toCSV([header, ...rows]);
};

export const downloadFile = (content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') => {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateTableLabelsHTML = (
  matches: Match[],
  players: Player[],
  round: number
): string => {
  const playerMap = new Map(players.map(p => [p.id, p]));
  const roundMatches = matches.filter(m => m.round === round && m.tableNumber > 0);

  const labelsHTML = roundMatches.map(match => `
    <div class="table-label" style="
      width: 200px;
      height: 100px;
      border: 2px solid #333;
      padding: 10px;
      margin: 10px;
      display: inline-block;
      page-break-inside: avoid;
      font-family: sans-serif;
    ">
      <div style="font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 8px;">
        第 ${match.tableNumber} 桌
      </div>
      <div style="font-size: 14px; text-align: center;">
        ${match.player1Id ? playerMap.get(match.player1Id)?.name || '' : ''}
      </div>
      <div style="font-size: 12px; text-align: center; color: #666;">VS</div>
      <div style="font-size: 14px; text-align: center;">
        ${match.player2Id ? playerMap.get(match.player2Id)?.name || '' : ''}
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>桌签 - 第${round}轮</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
        }
      </style>
    </head>
    <body>
      <h2 style="text-align: center;">第 ${round} 轮 桌签</h2>
      ${labelsHTML}
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;
};

export const printTableLabels = (matches: Match[], players: Player[], round: number) => {
  const html = generateTableLabelsHTML(matches, players, round);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};

const getFormatName = (format: string): string => {
  const names: Record<string, string> = {
    swiss: '瑞士轮',
    single_elimination: '单败淘汰赛',
    double_elimination: '双败淘汰赛',
    round_robin: '循环赛'
  };
  return names[format] || format;
};

const getResultName = (result: string | null): string => {
  const names: Record<string, string> = {
    win: '胜',
    loss: '负',
    draw: '平',
    bye: '轮空',
    forfeit: '弃权'
  };
  return result ? names[result] || result : '-';
};

const getStatusName = (status: string): string => {
  const names: Record<string, string> = {
    active: '正常',
    late: '迟到',
    dropped: '退赛',
    bye: '轮空'
  };
  return names[status] || status;
};

export const exportTournamentBackup = (
  tournament: Tournament,
  players: Player[],
  matches: Match[],
  playerStats: PlayerStats[]
): string => {
  const backup = {
    version: '1.0',
    exportedAt: Date.now(),
    tournament,
    players,
    matches,
    playerStats
  };
  return JSON.stringify(backup, null, 2);
};
