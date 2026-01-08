/**
 * Core utilities for Firestore Storage on Cloudflare Workers
 * Redesigned to use Firestore REST API with Service Account authentication
 */
import type { ApiResponse } from "@shared/types";
import type { Context } from "hono";
import * as jose from 'jose';

export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  EVIDENCE_BUCKET: R2Bucket;
  // Keeps the type system happy if other parts still refer to it during migration
  GlobalDurableObject?: any;
}

/**
 * Lightweight Firestore Client using REST API
 */
export class FirestoreClient {
  private static accessToken: string | null = null;
  private static tokenExpiry: number = 0;

  static async getAccessToken(env: Env): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const now = Math.floor(Date.now() / 1000);
    const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const key = await jose.importPKCS8(privateKey, 'RS256');

    const jwt = await new jose.SignJWT({
      iss: env.FIREBASE_CLIENT_EMAIL,
      sub: env.FIREBASE_CLIENT_EMAIL,
      aud: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/datastore',
      iat: now,
      exp: now + 3600,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .sign(key);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AUTH ERROR] Google OAuth failed:', errorText);
      throw new Error(`Google OAuth Failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  static async request(env: Env, path: string, method: string = 'GET', body?: any) {
    const token = await this.getAccessToken(env);
    const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Firestore API Error: ${response.status} ${error}`);
    }

    return response.status === 204 ? null : await response.json();
  }

  // Convert Firestore document to plain JS object
  static fromFirestore(doc: any) {
    const fields = doc.fields || {};
    const result: any = {};
    for (const [key, value] of Object.entries(fields)) {
      result[key] = this.unwrapValue(value);
    }
    // Extract ID from name (projects/id/databases/(default)/documents/coll/docId)
    result.id = doc.name.split('/').pop();
    return result;
  }

  private static unwrapValue(value: any): any {
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.integerValue !== undefined) return parseInt(value.integerValue);
    if (value.doubleValue !== undefined) return value.doubleValue;
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.timestampValue !== undefined) return value.timestampValue;
    if (value.nullValue !== undefined) return null;
    if (value.mapValue !== undefined) {
      const res: any = {};
      for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
        res[k] = this.unwrapValue(v);
      }
      return res;
    }
    if (value.arrayValue !== undefined) {
      return (value.arrayValue.values || []).map((v: any) => this.unwrapValue(v));
    }
    return value;
  }

  // Convert plain JS object to Firestore document fields
  static toFirestore(data: any) {
    const fields: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue;
      fields[key] = this.wrapValue(value);
    }
    return { fields };
  }

  private static wrapValue(value: any): any {
    if (value === null) return { nullValue: null };
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') {
      return Number.isInteger(value) ? { integerValue: value.toString() } : { doubleValue: value };
    }
    if (Array.isArray(value)) {
      return { arrayValue: { values: value.map(v => this.wrapValue(v)) } };
    }
    if (typeof value === 'object') {
      const fields: any = {};
      for (const [k, v] of Object.entries(value)) {
        fields[k] = this.wrapValue(v);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(value) };
  }
}

/**
 * Base class for Firestore Entities
 */
export abstract class Entity<State extends { id: string }> {
  protected readonly env: Env;
  protected readonly id: string;
  protected readonly collection: string;

  constructor(env: Env, id: string, collection: string) {
    this.env = env;
    this.id = id;
    this.collection = collection;
  }

  async getState(): Promise<State> {
    const doc = await FirestoreClient.request(this.env, `/${this.collection}/${this.id}`);
    return FirestoreClient.fromFirestore(doc);
  }

  async save(state: State): Promise<void> {
    const body = FirestoreClient.toFirestore(state);
    await FirestoreClient.request(this.env, `/${this.collection}/${this.id}`, 'PATCH', body);
  }

  async patch(p: Partial<State>): Promise<void> {
    const current = await this.getState();
    await this.save({ ...current, ...p });
  }

  async mutate(fn: (s: State) => State): Promise<State> {
    const current = await this.getState();
    const next = fn(current);
    await this.save(next);
    return next;
  }

  async exists(): Promise<boolean> {
    try {
      await this.getState();
      return true;
    } catch (e) {
      return false;
    }
  }

  async delete(): Promise<boolean> {
    await FirestoreClient.request(this.env, `/${this.collection}/${this.id}`, 'DELETE');
    return true;
  }
}

/**
 * Indexed Entity supporting listing and batch operations
 */
export abstract class IndexedEntity<S extends { id: string }> extends Entity<S> {
  static collection: string;
  static seedData?: ReadonlyArray<any>;

  static async create<T extends IndexedEntity<any>>(
    this: new (env: Env, id: string) => T,
    env: Env,
    state: any
  ): Promise<any> {
    const collection = (this as any).collection;
    const body = FirestoreClient.toFirestore(state);
    await FirestoreClient.request(env, `/${collection}/${state.id}`, 'PATCH', body);
    return state;
  }

  static async list<T extends IndexedEntity<any>>(
    this: new (env: Env, id: string) => T,
    env: Env,
    _cursor?: string | null, // Pagination simplified for now
    limit: number = 100
  ): Promise<{ items: any[]; next: string | null }> {
    const collection = (this as any).collection;
    const response = (await FirestoreClient.request(env, `/${collection}?pageSize=${limit}`)) as any;
    const documents = response.documents || [];
    return {
      items: documents.map((d: any) => FirestoreClient.fromFirestore(d)),
      next: response.nextPageToken || null
    };
  }

  static async ensureSeed<T extends IndexedEntity<any>>(
    this: new (env: Env, id: string) => T,
    env: Env
  ): Promise<void> {
    const collection = (this as any).collection;
    const seeds = (this as any).seedData;
    if (!seeds || seeds.length === 0) return;

    const existing = await (this as any).list(env, null, 1);
    if (existing.items.length === 0) {
      for (const seed of seeds) {
        await (this as any).create(env, seed);
      }
    }
  }

  static async delete<T extends IndexedEntity<any>>(
    this: new (env: Env, id: string) => T,
    env: Env,
    id: string
  ): Promise<boolean> {
    const collection = (this as any).collection;
    await FirestoreClient.request(env, `/${collection}/${id}`, 'DELETE');
    return true;
  }
}

// API HELPERS
export const ok = <T>(c: Context, data: T) => c.json({ success: true, data } as ApiResponse<T>);
export const bad = (c: Context, error: string) => c.json({ success: false, error } as ApiResponse, 400);
export const notFound = (c: Context, error = 'not found') => c.json({ success: false, error } as ApiResponse, 404);
export const isStr = (s: unknown): s is string => typeof s === 'string' && s.length > 0;