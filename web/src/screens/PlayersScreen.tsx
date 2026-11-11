import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api.ts';
import {
  forgetPlayer,
  loadPlayers,
  SAMPLE_PLAYERS,
  savePlayer,
  type SavedPlayer,
} from '../storage.ts';

type Props = { onChoose: (player: SavedPlayer) => void };

function messageOf(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'The server could not be reached.';
}

export function PlayersScreen({ onChoose }: Props) {
  const [saved, setSaved] = useState<SavedPlayer[]>(loadPlayers);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [created, setCreated] = useState<SavedPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { player, playerKey } = await api.createPlayer(name);
      const entry = { ...player, key: playerKey };
      setSaved(savePlayer(entry));
      setCreated(entry);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function open(playerKey: string, notFound: string) {
    setBusy(true);
    setError(null);
    try {
      const { player } = await api.me(playerKey);
      const entry = { ...player, key: playerKey };
      setSaved(savePlayer(entry));
      onChoose(entry);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 401
          ? notFound
          : messageOf(caught),
      );
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <main>
        <h1>Welcome, {created.displayName}</h1>
        <section className="card">
          <p>This is your player key. It is shown once, here.</p>
          <p className="key" data-testid="player-key">
            {created.key}
          </p>
          <p>
            This browser remembers it. To play as {created.displayName} in
            another browser, add the player there with this key.
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => onChoose(created)}
          >
            Continue
          </button>
        </section>
      </main>
    );
  }

  return (
    <main>
      <h1 className="brand">Arithmetic sprint</h1>
      <p className="lead">
        A 60-second round of mental arithmetic. Your results are saved and you
        see your progress over time. Only you see your results.
      </p>

      {error && <p className="error">{error}</p>}

      {saved.length > 0 && (
        <section className="card">
          <h2>Players in this browser</h2>
          <ul className="players">
            {saved.map((player) => (
              <li key={player.key}>
                <button
                  type="button"
                  className="primary"
                  onClick={() => onChoose(player)}
                >
                  Continue as {player.displayName}
                </button>
                {player.isSample && <span className="badge">Sample data</span>}
                <button
                  type="button"
                  className="link"
                  onClick={() => setSaved(forgetPlayer(player.key))}
                >
                  Forget
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>New player</h2>
        <form onSubmit={create}>
          <label htmlFor="display-name">Your name</label>
          <input
            id="display-name"
            value={name}
            maxLength={40}
            required
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="primary" disabled={busy}>
            Create player
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Add a player by key</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void open(key.trim(), 'No player has that key.');
          }}
        >
          <label htmlFor="player-key">Player key</label>
          <input
            id="player-key"
            value={key}
            required
            onChange={(event) => setKey(event.target.value)}
          />
          <button type="submit" disabled={busy}>
            Add player
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Sample players</h2>
        <p>Players with a simulated history, to see the progress view.</p>
        <div className="actions">
          {SAMPLE_PLAYERS.map((sample) => (
            <button
              key={sample.key}
              type="button"
              disabled={busy}
              onClick={() =>
                void open(
                  sample.key,
                  'The sample players are not in the database. Run npm run seed.',
                )
              }
            >
              Open {sample.displayName}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
