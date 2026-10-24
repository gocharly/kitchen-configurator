import { ANNOUNCEMENT_STEPS } from './siteConfig';

export function AnnouncementBar() {
  return (
    <p className="announcement">
      {ANNOUNCEMENT_STEPS.map((step) => (
        <span key={step}>{step}</span>
      ))}
    </p>
  );
}
