import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

export interface NewPostEmailProps {
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  readUrl: string;
  readingTimeMinutes?: number;
  categories?: string[];
}

export default function NewPostEmail({
  title,
  excerpt,
  author,
  publishedAt,
  readUrl,
  readingTimeMinutes = 5,
  categories = []
}: NewPostEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{title} — new analysis from Substack Intelligence</Preview>
      <Tailwind>
        <Body className="bg-[#f3f4f6] font-sans">
          <Container className="bg-white my-[32px] mx-auto p-[32px] rounded-xl border border-solid border-[#e5e7eb] max-w-[580px]">
            <Section>
              <Heading className="text-black text-[30px] font-bold m-0">{title}</Heading>
              <Text className="text-[#6b7280] text-[14px] leading-[20px] mt-2">
                {author} • {publishedAt} • {readingTimeMinutes} min read
              </Text>
              {categories.length > 0 && (
                <Text className="text-[#6366f1] text-[12px] uppercase tracking-widest mt-2">
                  {categories.join(' • ')}
                </Text>
              )}
            </Section>

            <Section className="mt-6">
              <Text className="text-[#1f2937] text-[16px] leading-[26px] whitespace-pre-line">{excerpt}</Text>
            </Section>

            <Section className="mt-8 text-center">
              <Button
                href={readUrl}
                className="bg-black text-white px-6 py-3 rounded-lg text-[16px] font-medium no-underline inline-block"
              >
                Read the full breakdown
              </Button>
            </Section>

            <Hr className="my-10 border border-[#f3f4f6]" />

            <Section>
              <Text className="text-[#6b7280] text-[12px] leading-[18px]">
                If you no longer want to receive new post alerts you can{' '}
                <Link href="{{{unsubscribe_url}}}" className="text-[#111827]">unsubscribe here</Link>.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
