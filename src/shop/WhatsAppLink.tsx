import type { ReactNode } from 'react';
import { WHATSAPP_PHONE } from './siteConfig';
import { buildWhatsAppLink } from './whatsapp';

interface WhatsAppLinkProps {
  message: string;
  className: string;
  children: ReactNode;
}

export function ChatIcon() {
  return (
    <svg className="chat-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20l1.4-4.2A8 8 0 1112 20a8 8 0 01-3.6-.9L4 20z" />
    </svg>
  );
}

export function WhatsAppLink({ message, className, children }: WhatsAppLinkProps) {
  return (
    <a
      href={buildWhatsAppLink(WHATSAPP_PHONE, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
