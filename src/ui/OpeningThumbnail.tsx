import type { OpeningKind } from '../domain/openings';

interface OpeningThumbnailProps {
  kind: OpeningKind;
}

export function OpeningThumbnail({ kind }: OpeningThumbnailProps) {
  if (kind === 'window') {
    return (
      <svg className="opening-thumbnail" viewBox="0 0 48 48" aria-hidden="true">
        <rect className="opening-frame" x="8" y="6" width="32" height="36" rx="2" />
        <rect className="opening-glass" x="12" y="10" width="11" height="28" />
        <rect className="opening-glass" x="25" y="10" width="11" height="28" />
      </svg>
    );
  }
  return (
    <svg className="opening-thumbnail" viewBox="0 0 48 48" aria-hidden="true">
      <rect className="opening-frame" x="12" y="4" width="24" height="40" rx="2" />
      <rect className="opening-leaf" x="15" y="7" width="18" height="37" />
      <rect className="opening-handle" x="29" y="26" width="2" height="8" rx="1" />
    </svg>
  );
}
