import { isAxiosError } from 'axios'
import type { CreateCropIssueRequest } from '@/types/dto/issues'

/**
 * Crop issue reports made without a connection, kept on the phone (IndexedDB) until they can be
 * sent. Each one belongs to the farmer who made it, so a report is only ever sent with its own
 * author's session, and nobody else signed in on the same phone sees it.
 *
 * Sending happens from the page (src/features/issues/components/IssueOutboxSync.tsx), not from the
 * service worker: it uses the current sign-in, works in every browser (Background Sync is
 * Chrome-only), and a report whose session has ended just waits for its author to sign in again.
 */

const DB_NAME = 'agrilink-offline'
const DB_VERSION = 1
const STORE = 'issue-reports'
const LOCK_NAME = 'agrilink-issue-outbox'

export interface QueuedIssueReport {
  /** Given by IndexedDB in the order reports were made, so sending keeps that order. */
  id?: number
  ownerId: string
  /** ISO time the farmer pressed "Report". */
  queuedAt: string
  fields: Omit<CreateCropIssueRequest, 'photo'>
  /** The prepared photo's bytes, with its name and type kept beside them. */
  photo?: { blob: Blob; name: string; type: string }
}

export interface SendResult {
  sent: number
  /** Reports the server refused for good (the crop was deleted, say), removed from the queue. */
  rejected: number
  /** Still waiting: the connection failed again, or the session ended. */
  remaining: number
}

const listeners = new Set<() => void>()

/** Calls `listener` whenever the queue changes in this tab. */
export function subscribeToOutbox(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((listener) => listener())
}

function isSupported(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      store.createIndex('ownerId', 'ownerId')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode)
      const request = run(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

/** Saves a report to send later. Throws when the phone can't store it (no IndexedDB, or full). */
export async function queueIssueReport(
  ownerId: string,
  { photo, ...fields }: CreateCropIssueRequest,
): Promise<void> {
  if (!isSupported()) throw new Error('Offline storage is not available.')
  const report: QueuedIssueReport = {
    ownerId,
    queuedAt: new Date().toISOString(),
    fields,
    photo: photo ? { blob: photo, name: photo.name, type: photo.type } : undefined,
  }
  await withStore('readwrite', (store) => store.add(report))
  notify()
}

/** This farmer's waiting reports, oldest first (an index lists equal keys in id order). */
export async function getQueuedIssueReports(ownerId: string): Promise<QueuedIssueReport[]> {
  if (!isSupported()) return []
  return withStore<QueuedIssueReport[]>('readonly', (store) =>
    store.index('ownerId').getAll(ownerId),
  )
}

async function removeQueuedIssueReport(id: number): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id))
  notify()
}

/** Back into the shape createIssue takes. */
export function toCreateRequest(report: QueuedIssueReport): CreateCropIssueRequest {
  const photo = report.photo
    ? new File([report.photo.blob], report.photo.name, { type: report.photo.type })
    : undefined
  return { ...report.fields, photo }
}

/**
 * The server answered, and asking again won't change the answer: a validation error, or a crop
 * that no longer exists. Sign-in problems (401, 403), rate limits (429) and timeouts (408) are
 * worth retrying, so they keep the report.
 */
function isPermanentRejection(error: unknown): boolean {
  const status = isAxiosError(error) ? error.response?.status : undefined
  return (
    status !== undefined && status >= 400 && status < 500 && ![401, 403, 408, 429].includes(status)
  )
}

/** True when the request never got an answer: no signal, or the connection dropped. */
export function isConnectionFailure(error: unknown): boolean {
  return isAxiosError(error) && !error.response && error.code !== 'ERR_CANCELED'
}

let sending: Promise<SendResult> | null = null

/**
 * Sends this farmer's waiting reports, oldest first, and stops at the first one that can't go
 * (the rest would fail the same way). Only one send runs at a time, across tabs too where the
 * browser has Web Locks, so no report is sent twice.
 */
export function sendQueuedIssueReports(
  ownerId: string,
  send: (request: CreateCropIssueRequest) => Promise<unknown>,
): Promise<SendResult> {
  if (sending) return sending

  const run = async (): Promise<SendResult> => {
    const reports = await getQueuedIssueReports(ownerId)
    const result: SendResult = { sent: 0, rejected: 0, remaining: reports.length }
    for (const report of reports) {
      try {
        await send(toCreateRequest(report))
        result.sent += 1
      } catch (error) {
        if (!isPermanentRejection(error)) break
        result.rejected += 1
      }
      result.remaining -= 1
      await removeQueuedIssueReport(report.id!)
    }
    return result
  }

  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  sending = (locks ? locks.request(LOCK_NAME, run) : run()).finally(() => {
    sending = null
  })
  return sending
}
