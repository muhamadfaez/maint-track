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
    const id = crypto.randomUUID();
    const ticketData: MaintenanceTicket = {
      ...TicketEntity.initialState,
      ...body,
      id,
      createdAt: now,
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
      timestamp: now
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
      updatedAt: now
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

  app.delete('/api/tickets/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = await TicketEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });

  // STORAGE (R2)
  app.post('/api/upload', async (c) => {
    const formData = await c.req.parseBody();
    const file = formData.file as File;

    if (!file) return bad(c, 'No file uploaded');

    const key = `${crypto.randomUUID()}-${file.name}`;
    await c.env.EVIDENCE_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    });

    return ok(c, { key, url: `/api/files/${key}` });
  });

  app.get('/api/files/:key', async (c) => {
    const key = c.req.param('key');
    const object = await c.env.EVIDENCE_BUCKET.get(key);

    if (!object) return notFound(c, 'File not found');

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, { headers });
  });

  app.delete('/api/files/:key', async (c) => {
    const key = c.req.param('key');
    await c.env.EVIDENCE_BUCKET.delete(key);
    return ok(c, { success: true });
  });
}