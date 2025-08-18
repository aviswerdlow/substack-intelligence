import {
  Body,
  Container,
  Column,
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

interface CompanyAlertProps {
  companyName: string;
  description?: string;
  website?: string;
  context: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  newsletterName: string;
  receivedAt: string;
  mentionCount: number;
  isHighPriority?: boolean;
}

export default function CompanyAlert({
  companyName = 'Sample Company',
  description,
  website,
  context = 'Sample context about the company mention.',
  sentiment = 'positive',
  confidence = 0.9,
  newsletterName = 'Sample Newsletter',
  receivedAt = new Date().toISOString(),
  mentionCount = 1,
  isHighPriority = false
}: CompanyAlertProps) {
  const previewText = `${companyName} mentioned ${mentionCount > 1 ? `${mentionCount} times` : 'in'} ${newsletterName}`;
  const priorityLabel = isHighPriority ? '🚨 HIGH PRIORITY' : '📈 New Company Alert';
  
  const sentimentColor = {
    positive: '#16a34a',
    negative: '#dc2626',
    neutral: '#6b7280'
  }[sentiment];

  const sentimentBg = {
    positive: '#dcfce7',
    negative: '#fee2e2',
    neutral: '#f3f4f6'
  }[sentiment];

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            {/* Priority Banner */}
            {isHighPriority && (
              <Section className="mb-[20px]">
                <div className="bg-[#fef3c7] border border-solid border-[#fbbf24] rounded-lg p-[12px] text-center">
                  <Text className="text-[#92400e] text-[14px] font-bold m-0">
                    🚨 HIGH PRIORITY COMPANY ALERT
                  </Text>
                </div>
              </Section>
            )}

            {/* Header */}
            <Section className="mt-[32px]">
              <Row>
                <Column align="center">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <Text className="text-white font-bold text-lg m-0">SI</Text>
                  </div>
                </Column>
              </Row>
              <Row className="mt-4">
                <Column align="center">
                  <Text className="text-[#666666] text-[12px] font-semibold uppercase tracking-wide text-center m-0">
                    {priorityLabel}
                  </Text>
                  <Heading className="text-black text-[24px] font-normal text-center p-0 my-[20px] mx-0">
                    {companyName}
                  </Heading>
                </Column>
              </Row>
            </Section>

            {/* Company Info */}
            <Section className="my-[24px]">
              {description && (
                <Text className="text-[#374151] text-[16px] leading-[24px] mb-4">
                  {description}
                </Text>
              )}
              
              {website && (
                <div className="text-center mb-4">
                  <Link
                    href={website}
                    className="bg-[#f3f4f6] text-[#374151] px-4 py-2 rounded text-[14px] font-medium no-underline inline-block border border-solid border-[#d1d5db]"
                  >
                    Visit Website →
                  </Link>
                </div>
              )}
            </Section>

            {/* Context Quote */}
            <Section className="my-[24px]">
              <div className="bg-[#f8fafc] border-l-4 border-solid border-[#3b82f6] pl-[16px] py-[12px] rounded-r">
                <Text className="text-[#1f2937] text-[14px] leading-[20px] m-0 italic">
                  "{context}"
                </Text>
              </div>
            </Section>

            {/* Mention Details */}
            <Section className="my-[24px]">
              <div className="bg-[#fafafa] rounded-lg p-[16px] border border-solid border-[#e5e5e5]">
                <Row className="mb-3">
                  <Column width="50%">
                    <Text className="text-[#666666] text-[12px] font-medium m-0 mb-1">
                      SENTIMENT
                    </Text>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: sentimentColor }}
                      />
                      <Text className="text-[#374151] text-[14px] font-medium m-0 capitalize">
                        {sentiment}
                      </Text>
                    </div>
                  </Column>
                  <Column width="50%">
                    <Text className="text-[#666666] text-[12px] font-medium m-0 mb-1">
                      CONFIDENCE
                    </Text>
                    <Text className="text-[#374151] text-[14px] font-medium m-0">
                      {Math.round(confidence * 100)}%
                    </Text>
                  </Column>
                </Row>

                <Row>
                  <Column width="50%">
                    <Text className="text-[#666666] text-[12px] font-medium m-0 mb-1">
                      SOURCE
                    </Text>
                    <Text className="text-[#374151] text-[14px] m-0">
                      {newsletterName}
                    </Text>
                  </Column>
                  <Column width="50%">
                    <Text className="text-[#666666] text-[12px] font-medium m-0 mb-1">
                      MENTIONS
                    </Text>
                    <Text className="text-[#374151] text-[14px] font-medium m-0">
                      {mentionCount} {mentionCount === 1 ? 'mention' : 'mentions'}
                    </Text>
                  </Column>
                </Row>
              </div>
            </Section>

            {/* Call to Action */}
            <Section className="text-center my-[32px]">
              <Text className="text-[#374151] text-[14px] mb-4">
                Investigate this opportunity in your dashboard
              </Text>
              <Link
                href="https://intelligence.substack.com/intelligence"
                className="bg-black text-white px-6 py-3 rounded text-[14px] font-medium no-underline inline-block"
              >
                View in Dashboard →
              </Link>
            </Section>

            {/* Additional Actions */}
            <Section className="my-[24px]">
              <div className="text-center">
                <Text className="text-[#666666] text-[12px] mb-3">
                  Quick Actions:
                </Text>
                <div className="flex justify-center gap-3">
                  {website && (
                    <Link
                      href={website}
                      className="text-[#3b82f6] text-[12px] no-underline px-2 py-1 border border-solid border-[#3b82f6] rounded"
                    >
                      Visit Site
                    </Link>
                  )}
                  <Link
                    href="https://intelligence.substack.com/companies"
                    className="text-[#3b82f6] text-[12px] no-underline px-2 py-1 border border-solid border-[#3b82f6] rounded"
                  >
                    View Companies
                  </Link>
                  <Link
                    href="https://intelligence.substack.com/settings"
                    className="text-[#666666] text-[12px] no-underline px-2 py-1 border border-solid border-[#d1d5db] rounded"
                  >
                    Settings
                  </Link>
                </div>
              </div>
            </Section>

            {/* Footer */}
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Section>
              <Row>
                <Column align="center">
                  <Text className="text-[#666666] text-[12px] leading-[16px] text-center">
                    Substack Intelligence Platform
                  </Text>
                  <Text className="text-[#666666] text-[11px] leading-[16px] text-center mt-1">
                    Real-time alerts • {new Date(receivedAt).toLocaleString()}
                  </Text>
                  <div className="flex justify-center gap-4 mt-3">
                    <Link
                      href="https://intelligence.substack.com/settings/notifications"
                      className="text-[#666666] text-[11px] no-underline"
                    >
                      Manage Alerts
                    </Link>
                    <Link
                      href="https://intelligence.substack.com/unsubscribe"
                      className="text-[#666666] text-[11px] no-underline"
                    >
                      Unsubscribe
                    </Link>
                  </div>
                </Column>
              </Row>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}