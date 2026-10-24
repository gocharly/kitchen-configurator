import { useEffect, useRef, useState } from 'react';
import type { Kitchen } from '../domain/kitchen';
import { buildKitchenLinkUrl, type LinkMode } from './kitchenUrl';

const FEEDBACK_DURATION_MS = 2000;

type CopyState = 'idle' | 'copied' | 'failed';

const IDLE_LABELS: Record<LinkMode, string> = {
  edit: 'Скопировать ссылку',
  view: 'Ссылка для просмотра',
};

const RESULT_LABELS = {
  copied: 'Ссылка скопирована',
  failed: 'Не удалось скопировать',
};

interface CopyLinkButtonProps {
  kitchen: Kitchen;
  mode: LinkMode;
}

export function CopyLinkButton({ kitchen, mode }: CopyLinkButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildKitchenLinkUrl(kitchen, mode));
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
      {state === 'idle' ? IDLE_LABELS[mode] : RESULT_LABELS[state]}
    </button>
  );
}
