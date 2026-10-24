import type { ReactNode } from 'react';
import { Icon } from './icons';

interface FlyoutProps {
  title: string;
  isClosing: boolean;
  contentKey: string;
  onClose: () => void;
  children: ReactNode;
}

export function Flyout({ title, isClosing, contentKey, onClose, children }: FlyoutProps) {
  return (
    <section className="flyout" role="tabpanel" aria-label={title} data-state={isClosing ? 'closing' : 'open'}>
      <header className="flyout-head">
        <h2>{title}</h2>
        <button type="button" className="bar-button" aria-label="Закрыть" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <div className="flyout-body" key={contentKey}>
        {children}
      </div>
    </section>
  );
}
