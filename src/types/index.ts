export type TournamentStatus = 'draft' | 'registration' | 'in_progress' | 'completed';

export type TournamentFormat = 'swiss' | 'single_elimination' | 'double_elimination' | 'round_robin';

export type PlayerStatus = 'active' | 'late' | 'dropped' | 'bye';

export type MatchResult = 'win' | 'loss' | 'draw' | 'bye' | 'forfeit' | null;

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  totalRounds: number;
  currentRound: number;
  status: TournamentStatus;
  createdAt: number;
  updatedAt: number;
  scoring: {
    winPoints: number;
    drawPoints: number;
    lossPoints: number;
    byePoints: number;
  };
  settings: {
    avoidRepeatMatches: boolean;
    autoBye: boolean;
    showTiebreakers: boolean;
  };
}

export interface Player {
  id: string;
  name: string;
  seed?: number;
  status: PlayerStatus;
  tournamentId: string;
  meta?: Record<string, any>;
}

export interface PlayerStats {
  playerId: string;
  tournamentId: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  gameWinCount: number;
  gameLossCount: number;
  opponents: string[];
  tiebreakers: {
    opponentWinRate: number;
    gameWinRate: number;
    cumulative: number;
  };
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  tableNumber: number;
  player1Id: string | null;
  player2Id: string | null;
  player1Result: MatchResult;
  player2Result: MatchResult;
  player1Games: number;
  player2Games: number;
  notes?: string;
  completed: boolean;
}

export interface Draft {
  id: string;
  name: string;
  type: 'tournament' | 'players';
  data: any;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerWithStats extends Player {
  stats: PlayerStats;
  rank?: number;
}

export interface MatchWithPlayers extends Match {
  player1?: Player;
  player2?: Player;
}
