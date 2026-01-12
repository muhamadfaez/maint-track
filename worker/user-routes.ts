import { Hono } from "hono";
import type { Env } from './core-utils';
import { TicketEntity, TimelineEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import type { MaintenanceTicket, TimelineEvent } from "@shared/types";

export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // TICKETS
  app.get('/api/tickets', async (c) => {
    await TicketEntity.ensureSeed(c.env);
    const cursor = c.req.query('cursor');
    const limit = c.req.query('limit');
    const page = await TicketEntity.list(
      c.env,
      cursor ?? null,
      limit ? Math.max(1, (Number(limit) | 0)) : undefined
    );
    return ok(c, page);
  });

  app.get('/api/tickets/:id', async (c) => {
    const id = c.req.param('id');
    const ticket = new TicketEntity(c.env, id);
    if (!await ticket.exists()) return notFound(c, 'Ticket not found');
    return ok(c, await ticket.getState());
  });

  app.post('/api/tickets', async (c) => {
    const body = await c.req.json() as Partial<MaintenanceTicket>;
    if (!body.title || !body.category || !body.reporter) {
      return bad(c, 'Title, Category, and Reporter are required');
    }
    const now = new Date().toISOString();
    const createdAt = body.createdAt || now;
    const id = crypto.randomUUID();
    const ticketData: MaintenanceTicket = {
      ...TicketEntity.initialState,
      ...body,
      id,
      createdAt: createdAt,
      updatedAt: now,
      status: body.status || 'New'
    };
    const created = await TicketEntity.create(c.env, ticketData);

    // Initial timeline entry
    await TimelineEntity.create(c.env, {
      id: crypto.randomUUID(),
      ticketId: id,
      category: 'Status Change',
      note: 'Ticket created',
      author: body.reporter,
      timestamp: createdAt
    });

    return ok(c, created);
  });

  app.patch('/api/tickets/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const ticket = new TicketEntity(c.env, id);
    if (!await ticket.exists()) return notFound(c, 'Ticket not found');
    const oldState = await ticket.getState();
    const now = new Date().toISOString();

    const newState = await ticket.mutate(s => ({
      ...s,
      ...body,
      updatedAt: now,
      createdAt: body.createdAt || s.createdAt
    }));

    // Log Contractor Assignment
    if (body.contractorName && body.contractorName !== oldState.contractorName) {
      await TimelineEntity.create(c.env, {
        id: crypto.randomUUID(),
        ticketId: id,
        category: 'Contractor Assignment',
        note: body.assignmentNote || `Contractor assigned: ${body.contractorName}`,
        author: 'Supervisor',
        timestamp: now
      });
    }

    // Log status changes
    if (body.status && body.status !== oldState.status) {
      await TimelineEntity.create(c.env, {
        id: crypto.randomUUID(),
        ticketId: id,
        category: 'Status Change',
        note: `Status updated to ${body.status}`,
        author: 'Supervisor',
        timestamp: now
      });
    }

    return ok(c, newState);
  });

  // TIMELINE
  app.get('/api/tickets/:id/timeline', async (c) => {
    const id = c.req.param('id');
    const events = await TimelineEntity.getByTicket(c.env, id);
    return ok(c, events);
  });

  app.post('/api/tickets/:id/timeline', async (c) => {
    const ticketId = c.req.param('id');
    const body = await c.req.json() as Partial<TimelineEvent>;
    if (!body.note || !body.category) return bad(c, 'Note and Category required');

    const ticket = new TicketEntity(c.env, ticketId);
    if (!await ticket.exists()) return notFound(c, 'Ticket not found');

    const now = new Date().toISOString();
    const event = await TimelineEntity.create(c.env, {
      id: crypto.randomUUID(),
      ticketId,
      category: body.category,
      note: body.note,
      author: body.author || 'Staff User',
      timestamp: now
    });

    await ticket.patch({ updatedAt: now });
    return ok(c, event);
  });

  app.patch('/api/tickets/:id/timeline/:eventId', async (c) => {
    const ticketId = c.req.param('id');
    const eventId = c.req.param('eventId');
    const body = await c.req.json() as Partial<TimelineEvent>;

    const ticket = new TicketEntity(c.env, ticketId);
    if (!await ticket.exists()) return notFound(c, 'Ticket not found');

    // Verify event exists (optional but good practice, though Firestore merge handles it)
    const events = await TimelineEntity.getByTicket(c.env, ticketId);
    const existing = events.find(e => e.id === eventId);
    if (!existing) return notFound(c, 'Event not found');

    const now = new Date().toISOString();

    // We reuse create/upsert logic since TimelineEntity uses simple storage
    const updatedEvent = {
      ...existing,
      ...body,
      id: eventId,
      ticketId
    };

    await TimelineEntity.create(c.env, updatedEvent);
    await ticket.patch({ updatedAt: now }); // Touch ticket

    return ok(c, updatedEvent);
  });

  app.delete('/api/tickets/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = await TicketEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });
}