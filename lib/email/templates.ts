import { render } from '@react-email/render';
import {
  WelcomeEmail,
  PasswordResetEmail,
  NewsletterEmail,
  NewPostEmail,
  SubscriptionConfirmationEmail,
  type WelcomeEmailData,
  type PasswordResetEmailData,
  type NewsletterEmailData,
  type NewPostEmailData,
  type SubscriptionConfirmationData,
} from '@substack-intelligence/email';

export interface RenderedEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function sanitizeText(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export function renderWelcomeEmailTemplate(data: WelcomeEmailData): RenderedEmailTemplate {
  const html = render(WelcomeEmail(data));
  const steps = data.onboardingSteps?.map((step, index) => `${index + 1}. ${step}`).join('\n') || '';

  const text = [`Hi ${data.name || 'there'},`, '',
    'Welcome to Substack Intelligence! Here’s how to get started:',
    steps,
    '',
    `Get started: ${data.primaryActionUrl}`,
    data.secondaryActionUrl ? `Learn more: ${data.secondaryActionUrl}` : '',
    '',
    `Support: ${data.supportEmail || 'support@substackai.com'}`,
  ].filter(Boolean).join('\n');

  return {
    subject: 'Welcome to Substack Intelligence',
    html,
    text,
  };
}

export function renderPasswordResetTemplate(data: PasswordResetEmailData): RenderedEmailTemplate {
  const html = render(PasswordResetEmail(data));
  const text = [`Hi ${data.name || 'there'},`, '',
    'We received a request to reset your Substack Intelligence password.',
    `Reset link: ${data.resetLink}`,
    '',
    `This link will expire in ${data.expiresInMinutes ?? 30} minutes.`,
    '',
    `Support: ${data.supportEmail || 'support@substackai.com'}`,
  ].join('\n');

  return {
    subject: 'Reset your Substack Intelligence password',
    html,
    text,
  };
}

export function renderNewsletterTemplate(data: NewsletterEmailData): RenderedEmailTemplate {
  const html = render(NewsletterEmail(data));
  const sections = data.sections
    .map(section => `${section.title}\n${section.body}`)
    .join('\n\n');

  const companies = data.featuredCompanies
    .map(company => `${company.name} — ${company.description}${company.url ? ` (${company.url})` : ''}`)
    .join('\n');

  const textParts = [
    `${data.title} (${data.issueDate})`,
    '',
    data.intro,
    sections,
    companies ? `\nFeatured companies:\n${companies}` : '',
    '',
    `Read more: ${data.callToAction.url}`,
  ].filter(Boolean);

  return {
    subject: `${data.title} • ${data.issueDate}`,
    html,
    text: textParts.join('\n'),
  };
}

export function renderNewPostTemplate(data: NewPostEmailData): RenderedEmailTemplate {
  const html = render(NewPostEmail(data));
  const text = [
    data.title,
    `${data.author} — ${data.publishedAt} — ${data.readingTimeMinutes ?? 5} min read`,
    '',
    sanitizeText(data.excerpt),
    '',
    `Read more: ${data.readUrl}`,
  ];

  if (data.categories?.length) {
    text.splice(2, 0, `Categories: ${data.categories.join(', ')}`);
  }

  return {
    subject: `${data.title} — new from Substack Intelligence`,
    html,
    text: text.join('\n'),
  };
}

export function renderSubscriptionConfirmationTemplate(
  data: SubscriptionConfirmationData
): RenderedEmailTemplate {
  const html = render(SubscriptionConfirmationEmail(data));
  const textLines = [
    `Hi ${data.name || 'there'},`,
    '',
    `Your ${data.planName} plan is active.`,
    `Price: ${data.price} (${data.billingInterval})`,
    `Start date: ${data.startDate}`,
  ];

  if (data.nextBillingDate) {
    textLines.push(`Next billing date: ${data.nextBillingDate}`);
  }

  textLines.push('', `Manage subscription: ${data.manageUrl}`, '', `Support: ${data.supportEmail || 'support@substackai.com'}`);

  return {
    subject: 'Your Substack Intelligence subscription is active',
    html,
    text: textLines.join('\n'),
  };
}
