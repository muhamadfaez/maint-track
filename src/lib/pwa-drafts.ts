const PENDING_TICKET_DRAFT_KEY = 'mtrack:pending-ticket-draft';

export type PendingTicketDraft = {
  title?: string;
  description?: string;
  location?: string;
  initialPhotoUrl?: string;
  source?: 'share' | 'file' | 'shortcut';
  createdAt: string;
};

export function storePendingTicketDraft(draft: Omit<PendingTicketDraft, 'createdAt'>) {
  const value: PendingTicketDraft = { ...draft, createdAt: new Date().toISOString() };
  localStorage.setItem(PENDING_TICKET_DRAFT_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('mtrack:draft-ready', { detail: value }));
}

export function consumePendingTicketDraft(): PendingTicketDraft | null {
  const raw = localStorage.getItem(PENDING_TICKET_DRAFT_KEY);
  if (!raw) return null;

  localStorage.removeItem(PENDING_TICKET_DRAFT_KEY);
  try {
    return JSON.parse(raw) as PendingTicketDraft;
  } catch {
    return null;
  }
}
