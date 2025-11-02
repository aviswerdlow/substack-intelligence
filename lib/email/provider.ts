import { randomUUID } from 'node:crypto';

type EmailProviderName = 'resend' | 'mock';

type EmailTag = { name: string; value: string };

type EmailHeaders = Record<string, string>;

type EmailAddress = string | { email: string; name?: string };

export interface EmailMessage {
  to: EmailAddress | EmailAddress[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: EmailAddress | EmailAddress[];
  bcc?: EmailAddress | EmailAddress[];
  replyTo?: EmailAddress | EmailAddress[];
  tags?: Array<EmailTag> | Record<string, string>;
  headers?: EmailHeaders;
  metadata?: Record<string, string | number | boolean>;
}

export interface EmailSendResult {
  id: string;
  provider: EmailProviderName;
  status: 'queued' | 'sent';
  to: string[];
  subject: string;
  raw?: unknown;
}

export interface ScheduleOptions {
  runAt: Date;
  idempotencyKey?: string;
}

export interface EmailProviderOptions {
  provider?: EmailProviderName;
  apiKey?: string;
  baseUrl?: string;
  defaultFrom?: string;
  onSend?: (message: EmailMessage) => void;
}

function normalizeRecipients(address: EmailAddress | EmailAddress[]): string[] {
  const list = Array.isArray(address) ? address : [address];
  return list.map(entry =>
    typeof entry === 'string' ? entry : entry.name ? `${entry.name} <${entry.email}>` : entry.email
  );
}

function normaliseTags(tags?: Array<EmailTag> | Record<string, string>): Array<EmailTag> | undefined {
  if (!tags) {
    return undefined;
  }

  if (Array.isArray(tags)) {
    return tags;
  }

  return Object.entries(tags).map(([name, value]) => ({ name, value }));
}

type ResendEmailResponse = {
  data?: { id: string };
  id?: string;
  error?: { message: string };
};

const DEFAULT_PROVIDER: EmailProviderName = 'resend';

export class EmailProvider {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly provider: EmailProviderName;
  private readonly defaultFrom?: string;
  private readonly onSend?: (message: EmailMessage) => void;

  constructor(options: EmailProviderOptions = {}) {
    this.provider = options.provider ?? DEFAULT_PROVIDER;
    this.apiKey = options.apiKey ?? process.env.RESEND_API_KEY;
    this.baseUrl = options.baseUrl ?? 'https://api.resend.com';
    this.defaultFrom = options.defaultFrom ?? process.env.EMAIL_FROM_ADDRESS ?? 'Substack Intelligence <intelligence@updates.substackai.com>';
    this.onSend = options.onSend;

    if (this.provider === 'resend' && !this.apiKey) {
      console.warn('[EmailProvider] RESEND_API_KEY not configured. Emails will be logged but not delivered.');
    }
  }

  async sendEmail(message: EmailMessage, idempotencyKey?: string): Promise<EmailSendResult> {
    const to = normalizeRecipients(message.to);
    const body = {
      from: message.from ?? this.defaultFrom,
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      cc: message.cc ? normalizeRecipients(message.cc) : undefined,
      bcc: message.bcc ? normalizeRecipients(message.bcc) : undefined,
      reply_to: message.replyTo ? normalizeRecipients(message.replyTo) : undefined,
      headers: message.headers,
      tags: normaliseTags(message.tags),
      metadata: message.metadata,
    };

    this.onSend?.(message);

    if (this.provider === 'mock' || !this.apiKey) {
      return {
        id: randomUUID(),
        provider: this.provider,
        status: 'queued',
        to,
        subject: message.subject,
        raw: body,
      };
    }

    const response = await fetch(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as ResendEmailResponse;

    if (!response.ok) {
      const errorMessage = payload?.error?.message ?? response.statusText;
      throw new Error(`Failed to send email via ${this.provider}: ${errorMessage}`);
    }

    return {
      id: payload.data?.id ?? payload.id ?? randomUUID(),
      provider: this.provider,
      status: 'sent',
      to,
      subject: message.subject,
      raw: payload,
    };
  }

  async sendBatch(messages: EmailMessage[], delayBetweenMs = 250): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];

    for (const message of messages) {
      const result = await this.sendEmail(message);
      results.push(result);

      if (delayBetweenMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenMs));
      }
    }

    return results;
  }

  async scheduleEmail(message: EmailMessage, options: ScheduleOptions): Promise<EmailSendResult> {
    const delay = options.runAt.getTime() - Date.now();

    if (delay <= 0) {
      return this.sendEmail(message, options.idempotencyKey);
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.sendEmail(message, options.idempotencyKey).then(resolve).catch(reject);
      }, delay);
    });
  }
}

let cachedProvider: EmailProvider | null = null;

export function getEmailProvider(options: EmailProviderOptions = {}): EmailProvider {
  if (!cachedProvider) {
    cachedProvider = new EmailProvider(options);
  }

  return cachedProvider;
}
