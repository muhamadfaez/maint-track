import { IndexedEntity } from "./core-utils";
import type { MaintenanceTicket, TimelineEvent } from "@shared/types";
import { MOCK_TICKETS } from "@shared/mock-data";
export class TicketEntity extends IndexedEntity<MaintenanceTicket> {
  static readonly entityName = "ticket";
  static readonly indexName = "tickets";
  static readonly initialState: MaintenanceTicket = {
    id: "",
    title: "",
    description: "",
    location: "",
    category: "Other",
    status: "New",
    priority: "Medium",
    reporter: "",
    createdAt: "",
    updatedAt: ""
  };
  static seedData = MOCK_TICKETS;
}
export class TimelineEntity extends IndexedEntity<TimelineEvent> {
  static readonly entityName = "timeline";
  static readonly indexName = "timeline-events";
  static readonly initialState: TimelineEvent = {
    id: "",
    ticketId: "",
    category: "Comment",
    note: "",
    author: "System",
    timestamp: ""
  };
  static async getByTicket(env: any, ticketId: string): Promise<TimelineEvent[]> {
    const { items } = await this.list(env);
    return items
      .filter(ev => ev.ticketId === ticketId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}