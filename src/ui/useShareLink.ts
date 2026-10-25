import { useState } from 'react';
import { encodeKitchenLink } from '../domain/kitchenLink';
import type { Kitchen } from '../domain/kitchen';
import { createShare } from '../share/shareApi';
import { buildShareUrl } from './kitchenUrl';

const MESSAGES = {
  copied: 'Ссылка скопирована. По ней всегда откроется эта кухня, только для просмотра.',
  failed: 'Не удалось создать ссылку. Проверьте соединение и попробуйте ещё раз.',
  manual: 'Ссылка создана. Скопируйте её из окна.',
};

async function requestShareUrl(kitchen: Kitchen): Promise<string> {
  const result = await createShare(encodeKitchenLink(kitchen));
  if (result.kind === 'failed') throw new Error('Share link was not created');
  return buildShareUrl(result.id);
}

async function copyWhenReady(urlPromise: Promise<string>): Promise<void> {
  if (typeof ClipboardItem === 'undefined') return navigator.clipboard.writeText(await urlPromise);
  const text = urlPromise.then((url) => new Blob([url], { type: 'text/plain' }));
  await navigator.clipboard.write([new ClipboardItem({ 'text/plain': text })]);
}

export function useShareLink(kitchen: Kitchen, onNotice: (text: string) => void) {
  const [isCreating, setIsCreating] = useState(false);

  const createLink = async () => {
    if (isCreating) return;
    setIsCreating(true);
    const urlPromise = requestShareUrl(kitchen);
    urlPromise.catch(() => undefined);
    try {
      await copyWhenReady(urlPromise);
      onNotice(MESSAGES.copied);
    } catch (error) {
      console.error('Share link was not copied', error);
      await finishWithoutClipboard(urlPromise, onNotice);
    } finally {
      setIsCreating(false);
    }
  };

  return { isCreating, createLink };
}

async function finishWithoutClipboard(urlPromise: Promise<string>, onNotice: (text: string) => void): Promise<void> {
  try {
    const url = await urlPromise;
    window.prompt('Скопируйте ссылку', url);
    onNotice(MESSAGES.manual);
  } catch {
    onNotice(MESSAGES.failed);
  }
}
