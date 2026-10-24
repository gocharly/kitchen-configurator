import { useEffect } from 'react';

const NOTICE_DURATION_MS = 4500;

interface NoticeProps {
  text: string;
  onDone: () => void;
}

export function Notice({ text, onDone }: NoticeProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, NOTICE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [text, onDone]);

  return (
    <div className="floating-bar notice" role="status">
      {text}
    </div>
  );
}
