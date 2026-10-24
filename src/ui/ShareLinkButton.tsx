import { useEffect, useRef, useState } from 'react';
import { encodeKitchenLink } from '../domain/kitchenLink';
import type { Kitchen } from '../domain/kitchen';
import { createShare } from '../share/shareApi';
import { buildShareUrl } from './kitchenUrl';

const FEEDBACK_DURATION_MS = 2500;

type ShareState = 'idle' | 'creating' | 'copied' | 'failed';

const LABELS: Record<ShareState, string> = {
  idle: 'Одноразовая ссылка',
  creating: 'Создаём ссылку',
  copied: 'Ссылка скопирована',
  failed: 'Не удалось создать ссылку',
};

interface ShareLinkButtonProps {
  kitchen: Kitchen;
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function ShareLinkButton({ kitchen }: ShareLinkButtonProps) {
  const [state, setState] = useState<ShareState>('idle');
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const showResult = (next: ShareState) => {
    setState(next);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState('idle'), FEEDBACK_DURATION_MS);
  };

  const createLink = async () => {
    if (state === 'creating') return;
    setState('creating');
    const result = await createShare(encodeKitchenLink(kitchen));
    if (result.kind === 'failed') return showResult('failed');
    try {
      await copyText(buildShareUrl(result.id));
      showResult('copied');
    } catch (error) {
      console.error('Share link was not copied', error);
      window.prompt('Скопируйте одноразовую ссылку', buildShareUrl(result.id));
      showResult('copied');
    }
  };

  return (
    <button type="button" className="catalog-button" disabled={state === 'creating'} onClick={createLink}>
      {LABELS[state]}
    </button>
  );
}
