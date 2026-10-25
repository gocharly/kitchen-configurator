import { useEffect, useState } from 'react';
import type { Kitchen } from './domain/kitchen';
import { decodeKitchenLink } from './domain/kitchenLink';
import { KitchenViewer } from './KitchenViewer';
import { loadShare } from './share/shareApi';

type PageState = { kind: 'loading' } | { kind: 'ready'; kitchen: Kitchen } | { kind: 'error'; reason: 'missing' | 'failed' };

const MESSAGES = {
  missing: { title: 'Ссылка не найдена', hint: 'Проверьте адрес или попросите отправителя прислать ссылку заново.' },
  failed: { title: 'Не удалось загрузить кухню', hint: 'Проверьте соединение и попробуйте ещё раз.' },
};

interface SharedKitchenPageProps {
  id: string;
}

export function SharedKitchenPage({ id }: SharedKitchenPageProps) {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setState({ kind: 'loading' });
    loadShare(id).then((result) => {
      if (!isCurrent) return;
      if (result.kind !== 'ready') return setState({ kind: 'error', reason: result.kind });
      const kitchen = decodeKitchenLink(result.token);
      setState(kitchen ? { kind: 'ready', kitchen } : { kind: 'error', reason: 'missing' });
    });
    return () => {
      isCurrent = false;
    };
  }, [id, attempt]);

  if (state.kind === 'ready') return <KitchenViewer kitchen={state.kitchen} />;
  if (state.kind === 'loading') return <main className="share-page" aria-busy="true" />;
  const message = MESSAGES[state.reason];
  return (
    <main className="share-page">
      <h1 className="share-title">{message.title}</h1>
      <p className="share-hint">{message.hint}</p>
      {state.reason === 'failed' && (
        <button type="button" className="catalog-button" onClick={() => setAttempt((current) => current + 1)}>
          Повторить
        </button>
      )}
    </main>
  );
}
