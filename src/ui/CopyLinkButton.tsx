import { useEffect, useRef, useState } from 'react';
import type { Kitchen } from '../domain/kitchen';
import { buildKitchenLinkUrl } from './kitchenUrl';

const FEEDBACK_DURATION_MS = 2000;

type CopyState = 'idle' | 'copied' | 'failed';

const LABELS: Record<CopyState, string> = {
  idle: 'Скопировать ссылку',
  copied: 'Ссылка скопирована',
  failed: 'Не удалось скопировать',
};

interface CopyLinkButtonProps {
  kitchen: Kitchen;
}

export function CopyLinkButton({ kitchen }: CopyLinkButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildKitchenLinkUrl(kitchen));
      setState('copied');
    } catch (error) {
      console.error('Kitchen link was not copied', error);
      setState('failed');
    }
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState('idle'), FEEDBACK_DURATION_MS);
  };

  return (
    <button type="button" className="catalog-button copy-link" onClick={copyLink}>
      {LABELS[state]}
    </button>
  );
}
