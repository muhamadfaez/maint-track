export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type MaintenanceCategory =
  | "Plumbing"
  | "Electrical"
  | "HVAC"
  | "Civil"
  | "Cleaning"
  | "Security"
  | "Landscaping"
  | "Other";
export type TicketStatus =
  | "New"
  | "In Progress"
  | "Waiting for Contractor"
  | "Pending"
  | "Completed"
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
export const MAINTENANCE_CATEGORIES: MaintenanceCategory[] = [
  "Plumbing", "Electrical", "HVAC", "Civil", "Cleaning", "Security", "Landscaping", "Other"
];
export const TICKET_STATUSES: TicketStatus[] = [
  "New", "In Progress", "Waiting for Contractor", "Pending", "Completed", "Closed"
];