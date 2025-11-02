import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

export interface NewsletterEmailProps {
  title: string;
  intro: string;
  issueDate: string;
  sections: Array<{ title: string; body: string }>;
  featuredCompanies: Array<{ name: string; description: string; url?: string }>;
  callToAction: { label: string; url: string };
}

export default function NewsletterEmail({
  title,
  intro,
  issueDate,
  sections,
  featuredCompanies,
  callToAction
}: NewsletterEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{title} • {issueDate}</Preview>
      <Tailwind>
        <Body className="bg-[#111827] font-sans">
          <Container className="bg-white my-[32px] mx-auto p-[32px] rounded-xl max-w-[640px]">
            <Section className="text-center">
              <Text className="text-[12px] uppercase tracking-[0.2em] text-[#6366f1] font-semibold m-0">Substack Intelligence</Text>
              <Heading className="text-black text-[30px] font-semibold mt-3 mb-2">{title}</Heading>
              <Text className="text-[#6b7280] text-[14px] m-0">Issue date: {issueDate}</Text>
            </Section>

            <Section className="mt-8">
              <Text className="text-[#1f2937] text-[16px] leading-[26px] whitespace-pre-line">{intro}</Text>
            </Section>

            {sections.length > 0 && (
              <Section className="mt-10 space-y-6">
                {sections.map((section, index) => (
                  <div key={index} className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-6">
                    <Text className="text-[#111827] text-[16px] font-semibold mb-2">{section.title}</Text>
                    <Text className="text-[#4b5563] text-[14px] leading-[22px] whitespace-pre-line">{section.body}</Text>
                  </div>
                ))}
              </Section>
            )}

            {featuredCompanies.length > 0 && (
              <Section className="mt-10">
                <Text className="text-[#111827] text-[16px] font-semibold mb-4">Featured Companies</Text>
                <div className="space-y-4">
                  {featuredCompanies.map((company, index) => (
                    <Row key={index} className="border border-[#e5e7eb] rounded-xl p-4">
                      <Column>
                        <Text className="text-[#111827] text-[15px] font-semibold m-0">{company.name}</Text>
                        <Text className="text-[#4b5563] text-[13px] leading-[20px] mt-1">{company.description}</Text>
                        {company.url && (
                          <Link href={company.url} className="text-[#6366f1] text-[13px] mt-2 inline-block">
                            Visit site →
                          </Link>
                        )}
                      </Column>
                    </Row>
                  ))}
                </div>
              </Section>
            )}

            <Section className="mt-10 text-center">
              <Link
                href={callToAction.url}
                className="bg-black text-white px-6 py-3 rounded-lg text-[16px] font-medium no-underline inline-block"
              >
                {callToAction.label}
              </Link>
            </Section>

            <Hr className="my-10 border border-[#e5e7eb]" />

            <Section className="text-center">
              <Text className="text-[#9ca3af] text-[12px] leading-[18px]">
                You are receiving this newsletter because you subscribed to Substack Intelligence insights.
                <br />
                <Link href="{{{unsubscribe_url}}}" className="text-[#6366f1]">Unsubscribe</Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
