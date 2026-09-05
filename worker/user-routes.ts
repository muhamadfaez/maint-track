import { Hono } from "hono";
import type { Env } from './core-utils';
import { PushSubscriptionEntity, TicketEntity, TimelineEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import type { MaintenanceTicket, TimelineEvent, PushSubscriptionRecord } from "@shared/types";
import { getPushConfiguration, sendPushToAll, sendPushToSubscription } from './push-utils';

async function stableSubscriptionId(endpoint: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // PUSH SUBSCRIPTIONS
  app.get('/api/push/vapid-public-key', (c) => {
    const config = getPushConfiguration(c.env);
    return ok(c, { publicKey: config.publicKey, configured: config.configured });
  });

  app.post('/api/push-subscriptions', async (c) => {
    const body = await c.req.json() as PushSubscriptionJSON;
    if (!body.endpoint) return bad(c, 'Push subscription endpoint is required');
    const id = await stableSubscriptionId(body.endpoint);
    const record: PushSubscriptionRecord = {
      id,
      endpoint: body.endpoint,
      expirationTime: body.expirationTime ?? null,
      keys: body.keys || {},
      userAgent: c.req.header('User-Agent'),
      createdAt: new Date().toISOString(),
    };
    return ok(c, await PushSubscriptionEntity.create(c.env, record));
  });

  app.post('/api/push/test', async (c) => {
    const body = await c.req.json() as { subscriptionId?: string };
    if (!body.subscriptionId) return bad(c, 'Subscription ID is required');
    const subscription = new PushSubscriptionEntity(c.env, body.subscriptionId);
    if (!await subscription.exists()) return notFound(c, 'Push subscription not found');

    try {
      await sendPushToSubscription(c.env, await subscription.getState(), {
        title: 'MTrack notifications are working',
        body: 'This device will receive maintenance ticket updates.',
        url: '/tickets',
        tag: 'mtrack-push-test',
      });
      return ok(c, { delivered: true });
    } catch (error) {
      console.error('[PUSH TEST]', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Push delivery failed',
      }, 502);
    }
  });

  app.delete('/api/push-subscriptions/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = await PushSubscriptionEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });

  // TICKETS
  app.get('/api/tickets', async (c) => {
    await TicketEntity.ensureSeed(c.env);
    const cursor = c.req.query('cursor');
    const limit = c.req.query('limit');
    // Existing screens and the offline cache expect a complete collection and
    // paginate/filter locally. Only return one page when explicitly requested.
    if (cursor === undefined && limit === undefined) {
      return ok(c, await TicketEntity.listAll(c.env));
    }
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
    const operationId = c.req.header('X-MTrack-Operation-Id');
    const id = body.id || operationId || crypto.randomUUID();
    const existingTicket = new TicketEntity(c.env, id);
    if (operationId && await existingTicket.exists()) {
      return ok(c, await existingTicket.getState());
    }
    const ticketData: MaintenanceTicket = {
      ...TicketEntity.initialState,
      ...body,
      id,
      createdAt: createdAt,
      updatedAt: now,
      status: body.status || 'In Progress / Pending'
    };
    const created = await TicketEntity.create(c.env, ticketData);

    // Initial timeline entry
    await TimelineEntity.create(c.env, {
      id: operationId ? `${operationId}-created` : crypto.randomUUID(),
      ticketId: id,
      category: 'Status Change',
      note: 'Ticket created',
      author: body.reporter,
      timestamp: createdAt
    });

    c.executionCtx.waitUntil(sendPushToAll(c.env, {
      title: 'New maintenance ticket',
      body: `${created.title} — ${created.location}`,
      url: `/tickets/${created.id}`,
      tag: `ticket-${created.id}`,
    }).catch(error => console.error('[PUSH BROADCAST]', error)));

    return ok(c, created);
  });

  app.patch('/api/tickets/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const ticket = new TicketEntity(c.env, id);
    if (!await ticket.exists()) return notFound(c, 'Ticket not found');
    const oldState = await ticket.getState();
    const operationId = c.req.header('X-MTrack-Operation-Id');
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
        id: operationId ? `${operationId}-assignment` : crypto.randomUUID(),
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
        id: operationId ? `${operationId}-status` : crypto.randomUUID(),
        ticketId: id,
        category: 'Status Change',
        note: `Status updated to ${body.status}`,
        author: 'Supervisor',
        timestamp: now
      });
    }

    if ((body.status && body.status !== oldState.status) ||
      (body.contractorName && body.contractorName !== oldState.contractorName)) {
      c.executionCtx.waitUntil(sendPushToAll(c.env, {
        title: body.status && body.status !== oldState.status ? 'Ticket status updated' : 'Contractor assigned',
        body: `${newState.title} — ${newState.status}`,
        url: `/tickets/${id}`,
        tag: `ticket-${id}`,
      }).catch(error => console.error('[PUSH BROADCAST]', error)));
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
    const operationId = c.req.header('X-MTrack-Operation-Id');
    if (operationId) {
      const existingEvent = new TimelineEntity(c.env, operationId);
      if (await existingEvent.exists()) return ok(c, await existingEvent.getState());
    }
    const event = await TimelineEntity.create(c.env, {
      id: operationId || crypto.randomUUID(),
      ticketId,
      category: body.category,
      note: body.note,
      author: body.author || 'Staff User',
      timestamp: now
    });

    await ticket.patch({ updatedAt: now });
    c.executionCtx.waitUntil(sendPushToAll(c.env, {
      title: 'New ticket update',
      body: `${body.author || 'Staff User'}: ${body.note.slice(0, 120)}`,
      url: `/tickets/${ticketId}`,
      tag: `ticket-${ticketId}`,
    }).catch(error => console.error('[PUSH BROADCAST]', error)));
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
