import { Player, PlayerStats, Match } from '../types';
import { generateId } from './storage';

interface PlayerWithStatsId {
  playerId: string;
  points: number;
  opponents: string[];
}

export const generateSwissPairing = (
  players: Player[],
  playerStats: PlayerStats[],
  tournamentId: string,
  round: number,
  avoidRepeat: boolean = true
): Match[] => {
  const activePlayers = players.filter(p => p.status === 'active');
  
  if (activePlayers.length === 0) return [];

  const statsMap = new Map(playerStats.map(s => [s.playerId, s]));
  
  const playersWithStats: PlayerWithStatsId[] = activePlayers.map(p => {
    const stats = statsMap.get(p.id);
    return {
      playerId: p.id,
      points: stats?.points || 0,
      opponents: stats?.opponents || []
    };
  });

  playersWithStats.sort((a, b) => b.points - a.points);

  const paired = new Set<string>();
  const matches: Match[] = [];
  let tableNumber = 1;

  const hasPlayedBefore = (player1Id: string, player2Id: string): boolean => {
    if (!avoidRepeat) return false;
    const stats1 = statsMap.get(player1Id);
    return stats1?.opponents.includes(player2Id) || false;
  };

  const playersList = [...playersWithStats];
  
  while (playersList.length >= 2) {
    const player1 = playersList.shift()!;
    let matched = false;

    for (let i = 0; i < playersList.length; i++) {
      const player2 = playersList[i];
      
      if (!hasPlayedBefore(player1.playerId, player2.playerId)) {
        matches.push({
          id: generateId(),
          tournamentId,
          round,
          tableNumber: tableNumber++,
          player1Id: player1.playerId,
          player2Id: player2.playerId,
          player1Result: null,
          player2Result: null,
          player1Games: 0,
          player2Games: 0,
          completed: false
        });
        playersList.splice(i, 1);
        matched = true;
        break;
      }
    }

    if (!matched && playersList.length > 0) {
      const player2 = playersList.shift()!;
      matches.push({
        id: generateId(),
        tournamentId,
        round,
        tableNumber: tableNumber++,
        player1Id: player1.playerId,
        player2Id: player2.playerId,
        player1Result: null,
        player2Result: null,
        player1Games: 0,
        player2Games: 0,
        completed: false
      });
    }
  }

  if (playersList.length === 1) {
    const byePlayer = playersList[0];
    matches.push({
      id: generateId(),
      tournamentId,
      round,
      tableNumber: 0,
      player1Id: byePlayer.playerId,
      player2Id: null,
      player1Result: 'bye',
      player2Result: null,
      player1Games: 0,
      player2Games: 0,
      completed: true
    });
  }

  return matches;
};

export const generateSingleElimination = (
  players: Player[],
  tournamentId: string
): Match[] => {
  const activePlayers = players.filter(p => p.status === 'active');
  const matches: Match[] = [];
  
  const numPlayers = activePlayers.length;
  const numRounds = Math.ceil(Math.log2(numPlayers));
  const totalSlots = Math.pow(2, numRounds);
  const byes = totalSlots - numPlayers;

  let round = 1;
  let tableNumber = 1;

  const firstRoundPlayers = [...activePlayers];
  const firstRoundMatches: Match[] = [];

  for (let i = 0; i < byes; i++) {
    if (firstRoundPlayers[i]) {
      firstRoundMatches.push({
        id: generateId(),
        tournamentId,
        round,
        tableNumber: tableNumber++,
        player1Id: firstRoundPlayers[i].id,
        player2Id: null,
        player1Result: 'bye',
        player2Result: null,
        player1Games: 0,
        player2Games: 0,
        completed: true
      });
    }
  }

  const remainingPlayers = firstRoundPlayers.slice(byes);
  for (let i = 0; i < remainingPlayers.length; i += 2) {
    if (i + 1 < remainingPlayers.length) {
      firstRoundMatches.push({
        id: generateId(),
        tournamentId,
        round,
        tableNumber: tableNumber++,
        player1Id: remainingPlayers[i].id,
        player2Id: remainingPlayers[i + 1].id,
        player1Result: null,
        player2Result: null,
        player1Games: 0,
        player2Games: 0,
        completed: false
      });
    }
  }

  matches.push(...firstRoundMatches);

  return matches;
};

export const generateSingleEliminationNextRound = (
  prevRoundMatches: Match[],
  tournamentId: string,
  nextRound: number
): Match[] => {
  const winners: string[] = [];

  prevRoundMatches.forEach(match => {
    if (match.player1Result === 'bye' && match.player1Id) {
      winners.push(match.player1Id);
    } else if (match.completed) {
      if (match.player1Result === 'win' && match.player1Id) {
        winners.push(match.player1Id);
      } else if (match.player2Result === 'win' && match.player2Id) {
        winners.push(match.player2Id);
      }
    }
  });

  const matches: Match[] = [];
  let tableNumber = 1;

  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      matches.push({
        id: generateId(),
        tournamentId,
        round: nextRound,
        tableNumber: tableNumber++,
        player1Id: winners[i],
        player2Id: winners[i + 1],
        player1Result: null,
        player2Result: null,
        player1Games: 0,
        player2Games: 0,
        completed: false
      });
    } else {
      matches.push({
        id: generateId(),
        tournamentId,
        round: nextRound,
        tableNumber: 0,
        player1Id: winners[i],
        player2Id: null,
        player1Result: 'bye',
        player2Result: null,
        player1Games: 0,
        player2Games: 0,
        completed: true
      });
    }
  }

  return matches;
};

export const generateRoundRobin = (
  players: Player[],
  tournamentId: string,
  totalRounds: number
): Match[][] => {
  const activePlayers = players.filter(p => p.status === 'active');
  const allRoundMatches: Match[][] = [];

  let playerList = [...activePlayers];
  if (playerList.length % 2 !== 0) {
    playerList.push({ id: 'bye', name: '轮空', status: 'bye' } as Player);
  }

  const n = playerList.length;
  const actualRounds = Math.min(totalRounds, n - 1);

  for (let round = 0; round < actualRounds; round++) {
    const matches: Match[] = [];
    let tableNumber = 1;

    for (let i = 0; i < n / 2; i++) {
      const player1 = playerList[i];
      const player2 = playerList[n - 1 - i];

      if (player1.id === 'bye' || player2.id === 'bye') {
        const actualPlayer = player1.id === 'bye' ? player2 : player1;
        matches.push({
          id: generateId(),
          tournamentId,
          round: round + 1,
          tableNumber: 0,
          player1Id: actualPlayer.id,
          player2Id: null,
          player1Result: 'bye',
          player2Result: null,
          player1Games: 0,
          player2Games: 0,
          completed: true
        });
      } else {
        matches.push({
          id: generateId(),
          tournamentId,
          round: round + 1,
          tableNumber: tableNumber++,
          player1Id: player1.id,
          player2Id: player2.id,
          player1Result: null,
          player2Result: null,
          player1Games: 0,
          player2Games: 0,
          completed: false
        });
      }
    }

    allRoundMatches.push(matches);

    const fixed = playerList[0];
    const rotated = [fixed, ...playerList.slice(n - 1), ...playerList.slice(1, n - 1)];
    playerList = rotated;
  }

  return allRoundMatches;
};

export const generateRoundRobinRound = (
  players: Player[],
  tournamentId: string,
  roundNumber: number
): Match[] => {
  const activePlayers = players.filter(p => p.status === 'active');

  let playerList = [...activePlayers];
  if (playerList.length % 2 !== 0) {
    playerList.push({ id: 'bye', name: '轮空', status: 'bye' } as Player);
  }

  const n = playerList.length;

  for (let r = 0; r < roundNumber - 1; r++) {
    const fixed = playerList[0];
    const rotated = [fixed, ...playerList.slice(n - 1), ...playerList.slice(1, n - 1)];
    playerList = rotated;
  }

  const matches: Match[] = [];
  let tableNumber = 1;

  for (let i = 0; i < n / 2; i++) {
    const player1 = playerList[i];
    const player2 = playerList[n - 1 - i];

    if (player1.id === 'bye' || player2.id === 'bye') {
      const actualPlayer = player1.id === 'bye' ? player2 : player1;
      matches.push({
        id: generateId(),
        tournamentId,
        round: roundNumber,
        tableNumber: 0,
        player1Id: actualPlayer.id,
        player2Id: null,
        player1Result: 'bye',
        player2Result: null,
        player1Games: 0,
        player2Games: 0,
        completed: true
      });
    } else {
      matches.push({
        id: generateId(),
        tournamentId,
        round: roundNumber,
        tableNumber: tableNumber++,
        player1Id: player1.id,
        player2Id: player2.id,
        player1Result: null,
        player2Result: null,
        player1Games: 0,
        player2Games: 0,
        completed: false
      });
    }
  }

  return matches;
};
