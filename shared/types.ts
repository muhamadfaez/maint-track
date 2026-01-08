export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type MaintenanceCategory =
  | "Plumbing"
  | "Electrical"
  | "HVAC"
  | "Carpentry"
  | "Janitorial"
  | "Security"
  | "Landscaping"
  | "Other";
export type TicketStatus =
  | "New"
  | "Assigned"
  | "In Progress"
  | "Waiting for Quote"
  | "Pending Materials"
  | "Completed"
  | "Closed";
export type ActionCategory =
  | "Comment"
  | "Status Change"
  | "Contractor Assignment"
  | "Vendor Comm";
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
  priority: "Low" | "Medium" | "High" | "Emergency";
  reporter: string;
  contractorName?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  initialPhotoUrl?: string;
}
export const MAINTENANCE_CATEGORIES: MaintenanceCategory[] = [
  "Plumbing", "Electrical", "HVAC", "Carpentry", "Janitorial", "Security", "Landscaping", "Other"
];
export const TICKET_STATUSES: TicketStatus[] = [
  "New", "Assigned", "In Progress", "Waiting for Quote", "Pending Materials", "Completed", "Closed"
];