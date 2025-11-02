import {
  Body,
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
  Button,
} from '@react-email/components';
import * as React from 'react';

export interface WelcomeEmailProps {
  name?: string;
  onboardingSteps?: string[];
  primaryActionUrl: string;
  primaryActionLabel?: string;
  secondaryActionUrl?: string;
  secondaryActionLabel?: string;
  supportEmail?: string;
  teamName?: string;
}

export default function WelcomeEmail({
  name = 'there',
  onboardingSteps = [
    'Connect your curated newsletters',
    'Review the AI-generated company summaries',
    'Invite your team to collaborate'
  ],
  primaryActionUrl,
  primaryActionLabel = 'Get Started',
  secondaryActionUrl,
  secondaryActionLabel,
  supportEmail = 'support@substackai.com',
  teamName = 'The Substack Intelligence Team'
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Substack Intelligence — your AI partner for consumer deal flow.</Preview>
      <Tailwind>
        <Body className="bg-[#f3f4f6] font-sans">
          <Container className="bg-white my-[32px] mx-auto p-[32px] rounded-xl border border-solid border-[#e5e7eb] max-w-[520px]">
            <Section className="text-center">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-4">
                <Text className="text-white text-lg font-semibold m-0">SI</Text>
              </div>
              <Heading className="text-black text-[28px] font-semibold m-0">Welcome, {name}!</Heading>
              <Text className="text-[#6b7280] text-[16px] leading-[24px] mt-2">
                We built Substack Intelligence to help you surface breakout consumer companies before they hit the headlines.
              </Text>
            </Section>

            <Section className="mt-8">
              <Text className="text-[#111827] text-[16px] font-semibold m-0 mb-3">
                Here’s how to make the most of your first week:
              </Text>
              <div className="space-y-3">
                {onboardingSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-[#f9fafb] border border-[#e5e7eb]">
                    <div className="w-6 h-6 rounded-full bg-black text-white text-[12px] flex items-center justify-center mt-[2px]">
                      {index + 1}
                    </div>
                    <Text className="text-[#1f2937] text-[14px] leading-[20px] m-0">{step}</Text>
                  </div>
                ))}
              </div>
            </Section>

            <Section className="mt-8 text-center">
              <Button
                href={primaryActionUrl}
                className="bg-black text-white px-6 py-3 rounded-lg text-[16px] font-medium no-underline inline-block"
              >
                {primaryActionLabel}
              </Button>
              {secondaryActionUrl && secondaryActionLabel && (
                <div className="mt-4">
                  <Link href={secondaryActionUrl} className="text-[#4b5563] text-[14px] underline">
                    {secondaryActionLabel}
                  </Link>
                </div>
              )}
            </Section>

            <Hr className="my-8 border border-[#f3f4f6]" />

            <Section>
              <Text className="text-[#4b5563] text-[14px] leading-[22px]">
                Need help getting set up? Reply directly to this email or reach out to us at{' '}
                <Link href={`mailto:${supportEmail}`} className="text-[#111827] font-medium">
                  {supportEmail}
                </Link>.
              </Text>
              <Text className="text-[#9ca3af] text-[12px] leading-[18px] mt-6">
                {teamName}<br />
                Substack Intelligence • AI-powered venture intelligence for consumer VC
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
