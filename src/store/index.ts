import { create } from 'zustand';
import { Tournament, Player, Match, PlayerStats, Draft } from '../types';
import { storage, generateId } from '../utils/storage';
import { calculatePlayerStats } from '../utils/ranking';

interface TournamentState {
  tournaments: Tournament[];
  currentTournamentId: string | null;
  players: Player[];
  matches: Match[];
  playerStats: PlayerStats[];
  drafts: Draft[];

  loadTournaments: () => void;
  createTournament: (data: Partial<Tournament>) => Tournament;
  updateTournament: (id: string, data: Partial<Tournament>) => void;
  deleteTournament: (id: string) => void;
  setCurrentTournament: (id: string | null) => void;

  addPlayer: (player: Omit<Player, 'id'>) => Player;
  addPlayers: (players: Omit<Player, 'id'>[]) => Player[];
  updatePlayer: (id: string, data: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  setPlayers: (players: Player[]) => void;

  addMatches: (matches: Match[]) => void;
  updateMatch: (id: string, data: Partial<Match>) => void;
  setMatches: (matches: Match[]) => void;

  calculateStats: () => void;

  saveDraft: (name: string, type: Draft['type'], data: any) => void;
  loadDraft: (id: string) => any;
  deleteDraft: (id: string) => void;

  saveAll: () => void;
  loadAll: () => void;
}

const defaultTournament: Partial<Tournament> = {
  format: 'swiss',
  totalRounds: 5,
  currentRound: 0,
  status: 'draft',
  scoring: {
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    byePoints: 3
  },
  settings: {
    avoidRepeatMatches: true,
    autoBye: true,
    showTiebreakers: true
  }
};

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournaments: [],
  currentTournamentId: null,
  players: [],
  matches: [],
  playerStats: [],
  drafts: [],

  loadTournaments: () => {
    const tournaments = storage.get<Tournament[]>('tournaments', []);
    set({ tournaments });
  },

  createTournament: (data) => {
    const now = Date.now();
    const tournament: Tournament = {
      id: generateId(),
      name: data.name || '新赛事',
      format: data.format || defaultTournament.format!,
      totalRounds: data.totalRounds || defaultTournament.totalRounds!,
      currentRound: 0,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      scoring: { ...defaultTournament.scoring!, ...data.scoring },
      settings: { ...defaultTournament.settings!, ...data.settings }
    };

    set(state => {
      const tournaments = [...state.tournaments, tournament];
      storage.set('tournaments', tournaments);
      return { tournaments, currentTournamentId: tournament.id };
    });

    return tournament;
  },

  updateTournament: (id, data) => {
    set(state => {
      const tournaments = state.tournaments.map(t =>
        t.id === id ? { ...t, ...data, updatedAt: Date.now() } : t
      );
      storage.set('tournaments', tournaments);
      return { tournaments };
    });
  },

  deleteTournament: (id) => {
    set(state => {
      const tournaments = state.tournaments.filter(t => t.id !== id);
      storage.set('tournaments', tournaments);
      storage.remove(`players_${id}`);
      storage.remove(`matches_${id}`);
      storage.remove(`stats_${id}`);
      return {
        tournaments,
        currentTournamentId: state.currentTournamentId === id ? null : state.currentTournamentId
      };
    });
  },

  setCurrentTournament: (id) => {
    set({ currentTournamentId: id });
    if (id) {
      const players = storage.get<Player[]>(`players_${id}`, []);
      const matches = storage.get<Match[]>(`matches_${id}`, []);
      const playerStats = storage.get<PlayerStats[]>(`stats_${id}`, []);
      set({ players, matches, playerStats });
    } else {
      set({ players: [], matches: [], playerStats: [] });
    }
  },

  addPlayer: (player) => {
    const newPlayer: Player = {
      ...player,
      id: generateId()
    };

    set(state => {
      const players = [...state.players, newPlayer];
      if (state.currentTournamentId) {
        storage.set(`players_${state.currentTournamentId}`, players);
      }
      return { players };
    });

    return newPlayer;
  },

  addPlayers: (newPlayers) => {
    const playersWithIds = newPlayers.map(p => ({
      ...p,
      id: generateId()
    }));

    set(state => {
      const players = [...state.players, ...playersWithIds];
      if (state.currentTournamentId) {
        storage.set(`players_${state.currentTournamentId}`, players);
      }
      return { players };
    });

    return playersWithIds;
  },

  updatePlayer: (id, data) => {
    set(state => {
      const players = state.players.map(p =>
        p.id === id ? { ...p, ...data } : p
      );
      if (state.currentTournamentId) {
        storage.set(`players_${state.currentTournamentId}`, players);
      }
      return { players };
    });
  },

  deletePlayer: (id) => {
    set(state => {
      const players = state.players.filter(p => p.id !== id);
      if (state.currentTournamentId) {
        storage.set(`players_${state.currentTournamentId}`, players);
      }
      return { players };
    });
  },

  setPlayers: (players) => {
    set(state => {
      if (state.currentTournamentId) {
        storage.set(`players_${state.currentTournamentId}`, players);
      }
      return { players };
    });
  },

  addMatches: (newMatches) => {
    set(state => {
      const matches = [...state.matches, ...newMatches];
      if (state.currentTournamentId) {
        storage.set(`matches_${state.currentTournamentId}`, matches);
      }
      return { matches };
    });
  },

  updateMatch: (id, data) => {
    set(state => {
      const matches = state.matches.map(m =>
        m.id === id ? { ...m, ...data } : m
      );
      if (state.currentTournamentId) {
        storage.set(`matches_${state.currentTournamentId}`, matches);
      }
      return { matches };
    });

    get().calculateStats();
  },

  setMatches: (matches) => {
    set(state => {
      if (state.currentTournamentId) {
        storage.set(`matches_${state.currentTournamentId}`, matches);
      }
      return { matches };
    });

    get().calculateStats();
  },

  calculateStats: () => {
    const state = get();
    const tournament = state.tournaments.find(t => t.id === state.currentTournamentId);
    if (!tournament) return;

    const playerStats = calculatePlayerStats(
      tournament.id,
      state.players,
      state.matches,
      tournament.scoring
    );

    set({ playerStats });

    if (state.currentTournamentId) {
      storage.set(`stats_${state.currentTournamentId}`, playerStats);
    }
  },

  saveDraft: (name, type, data) => {
    const draft: Draft = {
      id: generateId(),
      name,
      type,
      data,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    set(state => {
      const drafts = [...state.drafts, draft];
      storage.set('drafts', drafts);
      return { drafts };
    });
  },

  loadDraft: (id) => {
    const state = get();
    const draft = state.drafts.find(d => d.id === id);
    return draft?.data;
  },

  deleteDraft: (id) => {
    set(state => {
      const drafts = state.drafts.filter(d => d.id !== id);
      storage.set('drafts', drafts);
      return { drafts };
    });
  },

  saveAll: () => {
    const state = get();
    storage.set('tournaments', state.tournaments);
    storage.set('drafts', state.drafts);
    if (state.currentTournamentId) {
      storage.set(`players_${state.currentTournamentId}`, state.players);
      storage.set(`matches_${state.currentTournamentId}`, state.matches);
      storage.set(`stats_${state.currentTournamentId}`, state.playerStats);
    }
  },

  loadAll: () => {
    const tournaments = storage.get<Tournament[]>('tournaments', []);
    const drafts = storage.get<Draft[]>('drafts', []);
    set({ tournaments, drafts });
  }
}));
