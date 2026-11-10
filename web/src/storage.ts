// The players saved in this browser, with their keys. A convenience only:
// losing it loses nothing on the server, and the key can be added again.

export type SavedPlayer = {
  key: string;
  id: string;
  displayName: string;
  isSample: boolean;
};

const STORAGE_KEY = 'arithmetic-sprint.players';

export function loadPlayers(): SavedPlayer[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? (parsed as SavedPlayer[]) : [];
  } catch {
    return [];
  }
}

function store(players: SavedPlayer[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  } catch {
    // Storage can be blocked (private windows). The app still works.
  }
}

/** Saves the player first in the list, replacing an older copy. */
export function savePlayer(player: SavedPlayer): SavedPlayer[] {
  const players = [
    player,
    ...loadPlayers().filter((saved) => saved.key !== player.key),
  ];
  store(players);
  return players;
}

export function forgetPlayer(key: string): SavedPlayer[] {
  const players = loadPlayers().filter((saved) => saved.key !== key);
  store(players);
  return players;
}

/** Sample players exist only in a database seeded with npm run seed. */
export const SAMPLE_PLAYERS = [
  { key: 'sample-player-alex', displayName: 'Alex (sample)' },
  { key: 'sample-player-sam', displayName: 'Sam (sample)' },
];
