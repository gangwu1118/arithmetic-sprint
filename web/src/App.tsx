import { useEffect, useState } from 'react';

type ApiState = 'checking' | 'up' | 'down';

const label: Record<ApiState, string> = {
  checking: 'checking…',
  up: 'reachable',
  down: 'not reachable',
};

// Skeleton page. It proves the browser can reach the API, and through it
// the database, by way of the dev proxy. The game screens replace it.
export default function App() {
  const [api, setApi] = useState<ApiState>('checking');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/health')
      .then((response) => {
        if (!cancelled) setApi(response.ok ? 'up' : 'down');
      })
      .catch(() => {
        if (!cancelled) setApi('down');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>Arithmetic sprint</h1>
      <p>Project skeleton. The game is not built yet.</p>
      <p role="status">API and database: {label[api]}</p>
    </main>
  );
}
