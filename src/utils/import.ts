import { Player, Tournament, Match, PlayerStats } from '../types';
import { generateId } from './storage';

export const parseCSV = (csvContent: string): string[][] => {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    
    if (!inQuotes) {
      currentRow.push(currentCell.trim());
      result.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += '\n';
    }
  }

  return result;
};

export const importPlayersFromCSV = (
  csvContent: string,
  tournamentId: string
): Player[] => {
  const rows = parseCSV(csvContent);
  if (rows.length < 2) return [];

  const headerRow = rows[0].map(h => h.toLowerCase());
  const nameIndex = headerRow.findIndex(h => h.includes('姓名') || h.includes('名称') || h.includes('name'));
  const seedIndex = headerRow.findIndex(h => h.includes('种子') || h.includes('序号') || h.includes('seed'));

  const players: Player[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = nameIndex >= 0 ? row[nameIndex] : row[0];
    
    if (name && name.trim()) {
      const seed = seedIndex >= 0 && row[seedIndex] ? parseInt(row[seedIndex]) : undefined;
      players.push({
        id: generateId(),
        name: name.trim(),
        seed,
        status: 'active',
        tournamentId
      });
    }
  }

  return players;
};

export const parsePlayersFromText = (
  text: string,
  tournamentId: string
): Player[] => {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  const players: Player[] = [];

  lines.forEach((line, index) => {
    const name = line.trim();
    if (name) {
      players.push({
        id: generateId(),
        name,
        seed: index + 1,
        status: 'active',
        tournamentId
      });
    }
  });

  return players;
};

export const importTournamentBackup = (jsonContent: string): {
  tournament: Tournament;
  players: Player[];
  matches: Match[];
  playerStats: PlayerStats[];
} | null => {
  try {
    const data = JSON.parse(jsonContent);
    if (data.tournament && data.players && data.matches) {
      return {
        tournament: data.tournament,
        players: data.players,
        matches: data.matches,
        playerStats: data.playerStats || []
      };
    }
    return null;
  } catch {
    return null;
  }
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
};
