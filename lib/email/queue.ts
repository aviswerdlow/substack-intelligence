import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

import type { EmailMessage, EmailSendResult } from './provider';
import { getEmailProvider, type EmailProvider, type EmailProviderOptions } from './provider';

export interface QueueOptions {
  concurrency?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  provider?: EmailProviderOptions;
}

export interface QueueItemOptions {
  priority?: number;
  delayMs?: number;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

interface InternalQueueItem {
  id: string;
  message: EmailMessage;
  options: QueueItemOptions;
  attempts: number;
  resolve: (value: EmailSendResult | PromiseLike<EmailSendResult>) => void;
  reject: (reason?: unknown) => void;
}

export interface QueueMetrics {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  lastError?: string;
}

export declare interface EmailQueue {
  on(event: 'processed', listener: (payload: { id: string; result: EmailSendResult }) => void): this;
  on(event: 'failed', listener: (payload: { id: string; error: unknown; attempts: number }) => void): this;
  on(event: 'dequeued', listener: (payload: { id: string; message: EmailMessage }) => void): this;
  emit(event: 'processed', payload: { id: string; result: EmailSendResult }): boolean;
  emit(event: 'failed', payload: { id: string; error: unknown; attempts: number }): boolean;
  emit(event: 'dequeued', payload: { id: string; message: EmailMessage }): boolean;
}

export class EmailQueue extends EventEmitter {
  private readonly provider: EmailProvider;
  private readonly concurrency: number;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;

  private queue: InternalQueueItem[] = [];
  private activeCount = 0;
  private completedCount = 0;
  private failedCount = 0;
  private lastError?: string;

  constructor(options: QueueOptions = {}) {
    super();
    this.provider = getEmailProvider(options.provider);
    this.concurrency = options.concurrency ?? 3;
    this.retryAttempts = options.retryAttempts ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
  }

  enqueue(message: EmailMessage, options: QueueItemOptions = {}): Promise<EmailSendResult> {
    return new Promise((resolve, reject) => {
      const item: InternalQueueItem = {
        id: randomUUID(),
        message,
        options,
        attempts: 0,
        resolve,
        reject,
      };

      if (options.delayMs && options.delayMs > 0) {
        setTimeout(() => {
          this.queue.push(item);
          this.sortQueue();
          this.process();
        }, options.delayMs);
      } else {
        this.queue.push(item);
        this.sortQueue();
        this.process();
      }
    });
  }

  enqueueBatch(messages: EmailMessage[], options: QueueItemOptions = {}): Promise<EmailSendResult[]> {
    return Promise.all(messages.map(message => this.enqueue(message, options)));
  }

  async flush(): Promise<void> {
    if (this.activeCount === 0 && this.queue.length === 0) {
      return;
    }

    await new Promise<void>(resolve => {
      const checkInterval = setInterval(() => {
        if (this.activeCount === 0 && this.queue.length === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  getMetrics(): QueueMetrics {
    return {
      pending: this.queue.length,
      active: this.activeCount,
      completed: this.completedCount,
      failed: this.failedCount,
      lastError: this.lastError,
    };
  }

  private sortQueue() {
    this.queue.sort((a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0));
  }

  private process() {
    if (this.activeCount >= this.concurrency) {
      return;
    }

    const item = this.queue.shift();
    if (!item) {
      return;
    }

    this.activeCount += 1;
    this.emit('dequeued', { id: item.id, message: item.message });

    const attemptSend = async () => {
      try {
        item.attempts += 1;
        const result = await this.provider.sendEmail(item.message, item.options.idempotencyKey);
        this.completedCount += 1;
        this.emit('processed', { id: item.id, result });
        item.resolve(result);
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);

        if (item.attempts <= this.retryAttempts) {
          setTimeout(attemptSend, this.retryDelayMs);
          return;
        }

        this.failedCount += 1;
        this.emit('failed', { id: item.id, error, attempts: item.attempts });
        item.reject(error);
      } finally {
        if (item.attempts > this.retryAttempts || this.completedCount + this.failedCount > 0) {
          this.activeCount = Math.max(this.activeCount - 1, 0);
          this.process();
        }
      }
    };

    attemptSend().catch(error => {
      this.failedCount += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      item.reject(error);
      this.activeCount = Math.max(this.activeCount - 1, 0);
      this.emit('failed', { id: item.id, error, attempts: item.attempts });
      this.process();
    });
  }
}
