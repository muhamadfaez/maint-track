export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type MaintenanceCategory =
  | "Plumbing & sanitary"
  | "Electrical"
  | "Mechanical / HVAC"
  | "Building Structural"
  | "Security & Safety"
  | "Civil"
  | "Other";

export type TicketStatus =
  | "In Progress / Pending"
  | "Rectified"
  | "Closed";

export type ActionCategory =
  | "Comment"
  | "Status Change"
  | "Contractor Assignment"
  | "Contractor Communication";

export interface TimelineEvent {
  id: string;
  ticketId: string;
  category: ActionCategory;
  note: string;
  author: string;
  timestamp: string; // ISO string
}

export interface MaintenanceTicket {
  id: string;
  title: string;
  description: string;
  location: string; // e.g., "Building A, Room 302"
  category: MaintenanceCategory;
  status: TicketStatus;
  priority: "Low" | "Medium" | "High" | "Urgent";
  reporter: string;
  contractorName?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  initialPhotoUrl?: string;
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh?: string;
    auth?: string;
  };
  userAgent?: string;
  createdAt: string;
}

export const MAINTENANCE_CATEGORIES: MaintenanceCategory[] = [
  "Plumbing & sanitary",
  "Electrical",
  "Mechanical / HVAC",
  "Building Structural",
  "Security & Safety",
  "Civil",
  "Other"
];
export const TICKET_STATUSES: TicketStatus[] = [
  "In Progress / Pending",
  "Rectified",
  "Closed"
];
