import { IndexedEntity, Env } from "./core-utils";
import type { MaintenanceTicket, TimelineEvent, PushSubscriptionRecord } from "@shared/types";
import { MOCK_TICKETS } from "@shared/mock-data";

export class TicketEntity extends IndexedEntity<MaintenanceTicket> {
  static readonly collection = "tickets";
  static readonly initialState: MaintenanceTicket = {
    id: "",
    title: "",
    description: "",
    location: "",
    category: "Other",
    status: "In Progress / Pending",
    priority: "Medium",
    reporter: "",
    createdAt: "",
    updatedAt: ""
  };
  static seedData = MOCK_TICKETS;

  constructor(env: Env, id: string) {
    super(env, id, TicketEntity.collection);
  }
}

export class TimelineEntity extends IndexedEntity<TimelineEvent> {
  static readonly collection = "timeline";
  static readonly initialState: TimelineEvent = {
    id: "",
    ticketId: "",
    category: "Comment",
    note: "",
    author: "System",
    timestamp: ""
  };

  constructor(env: Env, id: string) {
    super(env, id, TimelineEntity.collection);
  }

  static async getByTicket(env: Env, ticketId: string): Promise<TimelineEvent[]> {
    // Basic implementation: fetch all and filter. 
    // Optimization: implement Firestore structured queries later.
    const { items } = await this.list(env);
    return items
      .filter(ev => ev.ticketId === ticketId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export class PushSubscriptionEntity extends IndexedEntity<PushSubscriptionRecord> {
  static readonly collection = "pushSubscriptions";
  static readonly initialState: PushSubscriptionRecord = {
    id: "",
    endpoint: "",
    expirationTime: null,
    keys: {},
    createdAt: ""
  };

  constructor(env: Env, id: string) {
    super(env, id, PushSubscriptionEntity.collection);
  }
}
