// The only module that talks to the optional backend (Phase 2).
// - No URL configured: every call fails fast with kind 'disabled' and no
//   network request is made; the app runs in static mode as before.
// - Every request has a timeout. Network failures mark the server offline so
//   the UI can show a notice and keep using local data.

import { useSyncExternalStore } from 'react';
import { getBackendSettings, isBackendConfigured } from '../storage/backend';
import type { CorrectionType } from '../types';

/** Render free tier can take ~30-60 s to wake up. */
const HEALTH_TIMEOUT_MS = 70_000;
/** After this long the health check is considered "waking up" in the UI. */
const SLOW_AFTER_MS = 4_000;
/** AI calls: model latency plus a possible cold start. */
const AI_TIMEOUT_MS = 120_000;
const SYNC_TIMEOUT_MS = 30_000;

// ---------- API types (mirror backend DTOs) ----------

export interface AiCorrection {
  original: string;
  corrected: string;
  type: CorrectionType;
  explanationVi: string;
}

export interface ChatTurn {
  role: 'client' | 'user';
  text: string;
}

export interface RoleplayRequest {
  scenario?: string;
  history: ChatTurn[];
  /** Empty with empty history: the client opens the conversation. */
  message: string;
}

export interface RoleplayResponse {
  reply: string;
  replyVi: string;
  corrections: AiCorrection[];
  naturalVersion: string;
  explanationVi: string;
}

export interface EmailCheckRequest {
  text: string;
  politeness?: 'hasipsio' | 'haeyo';
  situation?: string;
}

export interface EmailCheckResponse {
  corrected: string;
  corrections: AiCorrection[];
  explanationVi: string;
  score: number;
}

export interface RemoteProgress {
  progress: unknown;
  updatedAt: string;
}

interface HealthResponse {
  status: string;
  aiProvider: string;
  aiEnabled: boolean;
  accessKeyRequired: boolean;
}

// ---------- Errors ----------

export type ApiErrorKind =
  | 'disabled'
  | 'offline'
  | 'timeout'
  | 'unauthorized'
  | 'ai_disabled'
  | 'ai_failed'
  | 'bad_request'
  | 'not_found'
  | 'server';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  constructor(kind: ApiErrorKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
  }
}

// ---------- Connection status ----------

export type BackendStatus =
  | { state: 'disabled' }
  | { state: 'checking'; slow: boolean }
  | { state: 'online'; aiEnabled: boolean; aiProvider: string; accessKeyRequired: boolean }
  | { state: 'offline' };

let status: BackendStatus = isBackendConfigured() ? { state: 'checking', slow: false } : { state: 'disabled' };
let checkId = 0;
let checked = false;
const listeners = new Set<() => void>();

function setStatus(s: BackendStatus) {
  status = s;
  listeners.forEach((l) => l());
}

export function useBackendStatus(): BackendStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    throw new ApiError(controller.signal.aborted ? 'timeout' : 'offline', String(e));
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Pings /api/health (which also wakes a sleeping Render instance).
 * Safe to call any time; a newer call supersedes an older one.
 */
export async function checkBackend(): Promise<BackendStatus> {
  const { url } = getBackendSettings();
  const id = ++checkId;
  checked = true;
  if (!url) {
    setStatus({ state: 'disabled' });
    return status;
  }
  setStatus({ state: 'checking', slow: false });
  const slowTimer = window.setTimeout(() => {
    if (id === checkId && status.state === 'checking') setStatus({ state: 'checking', slow: true });
  }, SLOW_AFTER_MS);
  try {
    const res = await fetchWithTimeout(`${url}/api/health`, {}, HEALTH_TIMEOUT_MS);
    if (!res.ok) throw new ApiError('server', `HTTP ${res.status}`);
    const h = (await res.json()) as HealthResponse;
    if (id === checkId) {
      setStatus({
        state: 'online',
        aiEnabled: h.aiEnabled === true,
        aiProvider: String(h.aiProvider ?? ''),
        accessKeyRequired: h.accessKeyRequired === true,
      });
    }
  } catch {
    if (id === checkId) setStatus({ state: 'offline' });
  } finally {
    window.clearTimeout(slowTimer);
  }
  return status;
}

/** Runs the first health check once per page load (no-op without a URL). */
export function ensureBackendChecked(): void {
  if (!checked && isBackendConfigured()) void checkBackend();
}

// ---------- Requests ----------

async function request<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const { url, accessKey } = getBackendSettings();
  if (!url) throw new ApiError('disabled');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessKey) headers['X-Access-Key'] = accessKey;

  let res: Response;
  try {
    res = await fetchWithTimeout(`${url}${path}`, { ...init, headers }, timeoutMs);
  } catch (e) {
    if (e instanceof ApiError && (e.kind === 'offline' || e.kind === 'timeout')) {
      setStatus({ state: 'offline' });
    }
    throw e;
  }

  if (res.ok) return (await res.json()) as T;

  let code = '';
  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: unknown; message?: unknown };
    if (typeof body.error === 'string') code = body.error;
    if (typeof body.message === 'string') message = body.message;
  } catch {
    // Non-JSON error body.
  }
  if (res.status === 401) throw new ApiError('unauthorized', message);
  if (res.status === 404) throw new ApiError('not_found', message);
  if (code === 'ai_disabled') throw new ApiError('ai_disabled', message);
  if (code === 'ai_failed') throw new ApiError('ai_failed', message);
  if (res.status === 400) throw new ApiError('bad_request', message);
  throw new ApiError('server', message);
}

export function roleplay(req: RoleplayRequest): Promise<RoleplayResponse> {
  return request('/api/roleplay', { method: 'POST', body: JSON.stringify(req) }, AI_TIMEOUT_MS);
}

export function checkEmail(req: EmailCheckRequest): Promise<EmailCheckResponse> {
  return request('/api/email/check', { method: 'POST', body: JSON.stringify(req) }, AI_TIMEOUT_MS);
}

/** Resolves to null when the server has no saved progress yet. */
export async function getRemoteProgress(): Promise<RemoteProgress | null> {
  try {
    return await request<RemoteProgress>('/api/progress', { method: 'GET' }, SYNC_TIMEOUT_MS);
  } catch (e) {
    if (e instanceof ApiError && e.kind === 'not_found') return null;
    throw e;
  }
}

export function putRemoteProgress(progress: unknown): Promise<RemoteProgress> {
  return request('/api/progress', { method: 'PUT', body: JSON.stringify({ progress }) }, SYNC_TIMEOUT_MS);
}
