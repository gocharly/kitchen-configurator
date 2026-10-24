import { useEffect, useState } from 'react';
import type { Kitchen } from './domain/kitchen';
import { decodeKitchenLink } from './domain/kitchenLink';
import { KitchenViewer } from './KitchenViewer';
import { claimShare, type ClaimShareResult } from './share/shareApi';

type PageState = { kind: 'loading' } | { kind: 'ready'; kitchen: Kitchen } | { kind: 'error'; reason: 'used' | 'missing' | 'failed' };

const STORAGE_PREFIX = 'kitchen-share-';
const MESSAGES = {
  used: { title: 'Ссылка уже использована', hint: 'Попросите отправителя создать новую ссылку.' },
  missing: { title: 'Ссылка не найдена или устарела', hint: 'Попросите отправителя создать новую ссылку.' },
  failed: { title: 'Не удалось загрузить кухню', hint: 'Проверьте соединение и попробуйте ещё раз. Ссылка при этом не расходуется.' },
};

const pendingClaims = new Map<string, Promise<ClaimShareResult>>();

function claimOnce(id: string): Promise<ClaimShareResult> {
  const pending = pendingClaims.get(id) ?? claimShare(id);
  pendingClaims.set(id, pending);
  return pending.then((result) => {
    if (result.kind === 'failed') pendingClaims.delete(id);
    return result;
  });
}

function readStoredToken(id: string): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_PREFIX + id);
  } catch {
    return null;
  }
}

function storeToken(id: string, token: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + id, token);
  } catch {
    return;
  }
}

function toState(token: string): PageState {
  const kitchen = decodeKitchenLink(token);
  return kitchen ? { kind: 'ready', kitchen } : { kind: 'error', reason: 'missing' };
}

interface SharedKitchenPageProps {
  id: string;
}

export function SharedKitchenPage({ id }: SharedKitchenPageProps) {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    const stored = readStoredToken(id);
    if (stored) {
      setState(toState(stored));
      return;
    }
    setState({ kind: 'loading' });
    claimOnce(id).then((result) => {
      if (!isCurrent) return;
      if (result.kind === 'ready') {
        storeToken(id, result.token);
        setState(toState(result.token));
        return;
      }
      setState({ kind: 'error', reason: result.kind });
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
