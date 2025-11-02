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

export interface PasswordResetEmailProps {
  name?: string;
  resetLink: string;
  expiresInMinutes?: number;
  supportEmail?: string;
}

export default function PasswordResetEmail({
  name = 'there',
  resetLink,
  expiresInMinutes = 30,
  supportEmail = 'support@substackai.com'
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Substack Intelligence password</Preview>
      <Tailwind>
        <Body className="bg-[#f3f4f6] font-sans">
          <Container className="bg-white my-[32px] mx-auto p-[32px] rounded-xl border border-solid border-[#e5e7eb] max-w-[520px]">
            <Section className="text-center">
              <Heading className="text-black text-[26px] font-semibold m-0">Password reset requested</Heading>
              <Text className="text-[#6b7280] text-[14px] leading-[22px] mt-3">
                Hi {name}, we received a request to reset your Substack Intelligence password.
              </Text>
            </Section>

            <Section className="mt-6 text-center">
              <Button
                href={resetLink}
                className="bg-black text-white px-6 py-3 rounded-lg text-[16px] font-medium no-underline inline-block"
              >
                Reset password
              </Button>
              <Text className="text-[#9ca3af] text-[12px] leading-[18px] mt-3">
                This link expires in {expiresInMinutes} minutes.
              </Text>
            </Section>

            <Section className="mt-8">
              <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-4">
                <Text className="text-[#111827] text-[14px] leading-[22px] font-semibold m-0 mb-2">Didn’t request this?</Text>
                <Text className="text-[#4b5563] text-[13px] leading-[20px] m-0">
                  If you didn’t request a password reset, please ignore this message. Your account remains secure.
                </Text>
              </div>
            </Section>

            <Hr className="my-8 border border-[#f3f4f6]" />

            <Section>
              <Text className="text-[#6b7280] text-[13px] leading-[20px]">
                For help, contact{' '}
                <Link href={`mailto:${supportEmail}`} className="text-[#111827] font-medium">
                  {supportEmail}
                </Link>.
              </Text>
              <Text className="text-[#d1d5db] text-[11px] leading-[16px] mt-6">
                If you’re having trouble with the button above, copy and paste the URL below into your web browser:
                <br />
                <span className="text-[#6b7280] break-all">{resetLink}</span>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
