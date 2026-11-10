import { useCallback, useState } from 'react';
import {
  api,
  ApiError,
  type Attempt,
  type InputType,
  type Result,
  type Round,
} from './api.ts';
import { PlayScreen } from './play/PlayScreen.tsx';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { PlayersScreen } from './screens/PlayersScreen.tsx';
import { ResultScreen } from './screens/ResultScreen.tsx';
import type { SavedPlayer } from './storage.ts';

type Screen =
  | { name: 'players' }
  | { name: 'home' }
  | { name: 'play'; round: Round }
  | { name: 'result'; result: Result };

function messageOf(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'The server could not be reached.';
}

export default function App() {
  const [player, setPlayer] = useState<SavedPlayer | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'players' });
  const [notice, setNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // A round is requested in a click handler, never in an effect: React runs
  // effects twice in development, which would issue two rounds.
  async function startRound() {
    if (!player) return;
    setStarting(true);
    setNotice(null);
    try {
      const { round } = await api.startRound(player.key);
      setScreen({ name: 'play', round });
    } catch (caught) {
      setNotice(messageOf(caught));
      setScreen({ name: 'home' });
    } finally {
      setStarting(false);
    }
  }

  const finishRound = useCallback(
    (roundId: string, sent: { attempts: Attempt[]; inputType: InputType }) => {
      if (!player) return;
      api
        .submitResult(player.key, roundId, sent)
        .then(({ result }) => setScreen({ name: 'result', result }))
        .catch((caught: unknown) => {
          setNotice(`Your answers could not be saved: ${messageOf(caught)}`);
          setScreen({ name: 'home' });
        });
    },
    [player],
  );

  const abandonRound = useCallback(() => {
    setNotice(
      'The round stopped because the page was hidden. Nothing was saved.',
    );
    setScreen({ name: 'home' });
  }, []);

  if (!player || screen.name === 'players') {
    return (
      <PlayersScreen
        onChoose={(chosen) => {
          setPlayer(chosen);
          setNotice(null);
          setScreen({ name: 'home' });
        }}
      />
    );
  }

  switch (screen.name) {
    case 'home':
      return (
        <HomeScreen
          key={player.key}
          player={player}
          notice={notice}
          starting={starting}
          onStart={() => void startRound()}
          onSwitch={() => setScreen({ name: 'players' })}
        />
      );
    case 'play':
      return (
        <PlayScreen
          key={screen.round.id}
          round={screen.round}
          onFinished={(sent) => finishRound(screen.round.id, sent)}
          onAbandoned={abandonRound}
        />
      );
    case 'result':
      return (
        <ResultScreen
          result={screen.result}
          starting={starting}
          onPlayAgain={() => void startRound()}
          onBack={() => setScreen({ name: 'home' })}
        />
      );
  }
}
