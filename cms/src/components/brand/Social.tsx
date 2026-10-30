type P = { className?: string };

export const InstagramIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const FacebookIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3a21 21 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3Z" />
  </svg>
);

export const WhatsAppIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 2.5a9.4 9.4 0 0 0-8.1 14.2L2.6 21.4l4.8-1.3A9.4 9.4 0 1 0 12 2.5Zm0 17.1c-1.4 0-2.8-.4-4-1.1l-.3-.2-2.8.8.8-2.8-.2-.3A7.7 7.7 0 1 1 12 19.6Zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.3 6.3 0 0 1-3.1-2.7c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1l-.4-.2Z" />
  </svg>
);

export const ViberIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
    <path d="M6.3 18.6 4.5 21v-3.4C3.3 16.3 3 14.5 3 12c0-5 2.4-8 9-8s9 3 9 8-2.4 8-9 8c-2.4 0-4.2-.4-5.7-1.4Z" />
    <path d="M9.4 8.3c.4-.4 1-.3 1.3.1l.6.9c.2.4.1.8-.2 1.1l-.4.3c.3 1.2 1.3 2.2 2.5 2.6l.3-.4c.3-.3.8-.4 1.1-.2l.9.6c.4.3.5.9.1 1.3-.6.7-1.5 1-2.4.7a6.4 6.4 0 0 1-4.4-4.4c-.2-.9 0-1.9.6-2.6Z" />
  </svg>
);
