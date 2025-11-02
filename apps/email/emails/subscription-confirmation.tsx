import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

export interface SubscriptionConfirmationProps {
  name?: string;
  planName: string;
  price: string;
  billingInterval: string;
  manageUrl: string;
  supportEmail?: string;
  startDate: string;
  nextBillingDate?: string;
}

export default function SubscriptionConfirmationEmail({
  name = 'there',
  planName,
  price,
  billingInterval,
  manageUrl,
  supportEmail = 'support@substackai.com',
  startDate,
  nextBillingDate
}: SubscriptionConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Substack Intelligence subscription is active</Preview>
      <Tailwind>
        <Body className="bg-[#f3f4f6] font-sans">
          <Container className="bg-white my-[32px] mx-auto p-[32px] rounded-xl border border-solid border-[#e5e7eb] max-w-[540px]">
            <Section>
              <Heading className="text-black text-[28px] font-semibold m-0">Subscription confirmed</Heading>
              <Text className="text-[#6b7280] text-[14px] leading-[22px] mt-2">
                Hi {name}, thanks for subscribing to Substack Intelligence. Here’s a summary of your plan.
              </Text>
            </Section>

            <Section className="mt-6">
              <Row className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-5">
                <Column>
                  <Text className="text-[#111827] text-[15px] font-semibold m-0">{planName}</Text>
                  <Text className="text-[#4b5563] text-[13px] leading-[20px] mt-1">
                    {price} • billed {billingInterval}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section className="mt-6">
              <Text className="text-[#111827] text-[14px] font-semibold mb-2">Billing details</Text>
              <div className="space-y-2">
                <Text className="text-[#4b5563] text-[13px] leading-[20px] m-0">Start date: {startDate}</Text>
                {nextBillingDate && (
                  <Text className="text-[#4b5563] text-[13px] leading-[20px] m-0">Next billing date: {nextBillingDate}</Text>
                )}
              </div>
            </Section>

            <Section className="mt-8 text-center">
              <Button
                href={manageUrl}
                className="bg-black text-white px-6 py-3 rounded-lg text-[16px] font-medium no-underline inline-block"
              >
                Manage subscription
              </Button>
            </Section>

            <Hr className="my-10 border border-[#f3f4f6]" />

            <Section>
              <Text className="text-[#6b7280] text-[13px] leading-[20px]">
                Have a question? Contact us at{' '}
                <a href={`mailto:${supportEmail}`} className="text-[#111827]">
                  {supportEmail}
                </a>.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
