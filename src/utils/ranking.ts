import { Player, PlayerStats, Match, PlayerWithStats } from '../types';

export const calculatePlayerStats = (
  tournamentId: string,
  players: Player[],
  matches: Match[],
  scoring: { winPoints: number; drawPoints: number; lossPoints: number; byePoints: number }
): PlayerStats[] => {
  const statsMap = new Map<string, PlayerStats>();

  players.forEach(player => {
    statsMap.set(player.id, {
      playerId: player.id,
      tournamentId,
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      byes: 0,
      forfeits: 0,
      gameWinCount: 0,
      gameLossCount: 0,
      opponents: [],
      tiebreakers: {
        opponentWinRate: 0,
        gameWinRate: 0,
        cumulative: 0
      }
    });
  });

  matches.forEach(match => {
    if (!match.completed) return;

    const processPlayer = (
      playerId: string | null,
      result: string | null,
      gamesWon: number,
      gamesLost: number,
      opponentId: string | null
    ) => {
      if (!playerId) return;
      const stats = statsMap.get(playerId);
      if (!stats) return;

      if (opponentId && opponentId !== 'bye') {
        stats.opponents.push(opponentId);
      }

      stats.gameWinCount += gamesWon;
      stats.gameLossCount += gamesLost;

      switch (result) {
        case 'win':
          stats.wins++;
          stats.points += scoring.winPoints;
          break;
        case 'loss':
          stats.losses++;
          stats.points += scoring.lossPoints;
          break;
        case 'forfeit':
          stats.losses++;
          stats.forfeits++;
          stats.points += scoring.lossPoints;
          break;
        case 'draw':
          stats.draws++;
          stats.points += scoring.drawPoints;
          break;
        case 'bye':
          stats.byes++;
          stats.points += scoring.byePoints;
          break;
      }
    };

    processPlayer(
      match.player1Id,
      match.player1Result,
      match.player1Games,
      match.player2Games,
      match.player2Id
    );

    processPlayer(
      match.player2Id,
      match.player2Result,
      match.player2Games,
      match.player1Games,
      match.player1Id
    );
  });

  const statsArray = Array.from(statsMap.values());

  statsArray.forEach(stats => {
    const totalGames = stats.gameWinCount + stats.gameLossCount;
    stats.tiebreakers.gameWinRate = totalGames > 0 ? stats.gameWinCount / totalGames : 0;

    let totalOpponentPoints = 0;
    let opponentCount = 0;
    stats.opponents.forEach(opponentId => {
      const opponentStats = statsMap.get(opponentId);
      if (opponentStats) {
        totalOpponentPoints += opponentStats.points;
        opponentCount++;
      }
    });
    stats.tiebreakers.opponentWinRate = opponentCount > 0 ? totalOpponentPoints / opponentCount : 0;

    stats.tiebreakers.cumulative = stats.points;
  });

  return statsArray;
};

export const sortPlayersByRank = (
  players: Player[],
  playerStats: PlayerStats[],
  showTiebreakers: boolean = true
): PlayerWithStats[] => {
  const statsMap = new Map(playerStats.map(s => [s.playerId, s]));

  const playersWithStats: PlayerWithStats[] = players.map(player => ({
    ...player,
    stats: statsMap.get(player.id) || {
      playerId: player.id,
      tournamentId: player.tournamentId,
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      byes: 0,
      forfeits: 0,
      gameWinCount: 0,
      gameLossCount: 0,
      opponents: [],
      tiebreakers: { opponentWinRate: 0, gameWinRate: 0, cumulative: 0 }
    }
  }));

  playersWithStats.sort((a, b) => {
    if (b.stats.points !== a.stats.points) {
      return b.stats.points - a.stats.points;
    }

    if (showTiebreakers) {
      if (b.stats.tiebreakers.opponentWinRate !== a.stats.tiebreakers.opponentWinRate) {
        return b.stats.tiebreakers.opponentWinRate - a.stats.tiebreakers.opponentWinRate;
      }

      if (b.stats.tiebreakers.gameWinRate !== a.stats.tiebreakers.gameWinRate) {
        return b.stats.tiebreakers.gameWinRate - a.stats.tiebreakers.gameWinRate;
      }
    }

    return 0;
  });

  playersWithStats.forEach((player, index) => {
    player.rank = index + 1;
  });

  return playersWithStats;
};

export const getPlayerMatches = (
  playerId: string,
  matches: Match[],
  players: Player[]
): (Match & { opponent?: Player; result?: string })[] => {
  const playerMap = new Map(players.map(p => [p.id, p]));

  return matches
    .filter(m => m.player1Id === playerId || m.player2Id === playerId)
    .map(match => {
      const isPlayer1 = match.player1Id === playerId;
      const opponentId = isPlayer1 ? match.player2Id : match.player1Id;
      const result = isPlayer1 ? match.player1Result : match.player2Result;

      return {
        ...match,
        opponent: opponentId ? playerMap.get(opponentId) : undefined,
        result
      };
    })
    .sort((a, b) => a.round - b.round);
};

export const findSingleEliminationChampion = (
  tournamentId: string,
  allMatches: Match[],
  allPlayers: Player[]
): Player | null => {
  const tournamentMatches = allMatches.filter(m => m.tournamentId === tournamentId);
  if (tournamentMatches.length === 0) return null;

  const maxRound = Math.max(...tournamentMatches.map(m => m.round));
  const finalMatches = tournamentMatches.filter(m => m.round === maxRound && m.tableNumber > 0);
  
  if (finalMatches.length === 0) return null;
  
  const finalMatch = finalMatches[0];
  if (!finalMatch.completed) return null;

  let championId: string | null = null;
  if (finalMatch.player1Result === 'win') {
    championId = finalMatch.player1Id;
  } else if (finalMatch.player2Result === 'win') {
    championId = finalMatch.player2Id;
  }

  if (!championId) return null;
  return allPlayers.find(p => p.id === championId) || null;
};
