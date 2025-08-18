import {
  Body,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface CompanyMention {
  id: string;
  name: string;
  description?: string;
  website?: string;
  context: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  newsletter_name: string;
  received_at: string;
  funding_status?: string;
}

interface DailyIntelligenceReportProps {
  date: string;
  companies: CompanyMention[];
  summary: {
    totalCompanies: number;
    totalMentions: number;
    topNewsletters: string[];
  };
}

export default function DailyIntelligenceReport({
  date = new Date().toLocaleDateString(),
  companies = [],
  summary = {
    totalCompanies: 0,
    totalMentions: 0,
    topNewsletters: []
  }
}: DailyIntelligenceReportProps) {
  const previewText = `${summary.totalCompanies} companies discovered • ${summary.totalMentions} mentions • ${date}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            {/* Header */}
            <Section className="mt-[32px]">
              <Row>
                <Column align="center">
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                    <Text className="text-white font-bold text-xl m-0">SI</Text>
                  </div>
                </Column>
              </Row>
              <Row className="mt-4">
                <Column align="center">
                  <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                    Daily Intelligence Report
                  </Heading>
                  <Text className="text-[#666666] text-[14px] leading-[24px] text-center">
                    {date} • Consumer VC Deal Sourcing
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Executive Summary */}
            <Section className="my-[32px]">
              <div className="bg-[#f6f9fc] border border-solid border-[#e1e8ed] rounded-lg p-[20px]">
                <Heading className="text-black text-[18px] font-semibold mt-0 mb-[16px]">
                  Executive Summary
                </Heading>
                <Row>
                  <Column width="33%" className="pr-2">
                    <Text className="text-[32px] font-bold text-black m-0 leading-none">
                      {summary.totalCompanies}
                    </Text>
                    <Text className="text-[12px] text-[#666666] mt-1 mb-0">
                      Companies
                    </Text>
                  </Column>
                  <Column width="33%" className="px-2">
                    <Text className="text-[32px] font-bold text-black m-0 leading-none">
                      {summary.totalMentions}
                    </Text>
                    <Text className="text-[12px] text-[#666666] mt-1 mb-0">
                      Mentions
                    </Text>
                  </Column>
                  <Column width="33%" className="pl-2">
                    <Text className="text-[32px] font-bold text-black m-0 leading-none">
                      {summary.topNewsletters.length}
                    </Text>
                    <Text className="text-[12px] text-[#666666] mt-1 mb-0">
                      Sources
                    </Text>
                  </Column>
                </Row>
              </div>
            </Section>

            {companies.length > 0 && (
              <>
                <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
                
                {/* Company Discoveries */}
                <Section>
                  <Heading className="text-black text-[18px] font-semibold mt-0 mb-[16px]">
                    Company Discoveries
                  </Heading>
                  
                  {companies.slice(0, 10).map((company, index) => (
                    <div key={company.id} className="mb-[24px] pb-[20px] border-b border-solid border-[#f0f0f0] last:border-b-0">
                      <Row className="mb-2">
                        <Column>
                          <div className="flex items-center gap-2">
                            <Text className="text-black text-[16px] font-semibold m-0">
                              {company.name}
                            </Text>
                            {company.website && (
                              <Link
                                href={company.website}
                                className="text-[#067df7] text-[12px] no-underline ml-2"
                              >
                                Visit →
                              </Link>
                            )}
                          </div>
                          {company.description && (
                            <Text className="text-[#666666] text-[14px] mt-1 mb-2 leading-[20px]">
                              {company.description}
                            </Text>
                          )}
                        </Column>
                      </Row>
                      
                      {/* Context Quote */}
                      <div className="bg-[#f8f9fa] border-l-4 border-solid border-[#007ee6] pl-[12px] py-[8px] my-[12px]">
                        <Text className="text-[#374151] text-[13px] leading-[18px] m-0 italic">
                          "{company.context.slice(0, 200)}{company.context.length > 200 ? '...' : ''}"
                        </Text>
                      </div>
                      
                      {/* Metadata */}
                      <Row className="mt-2">
                        <Column width="50%">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${
                              company.sentiment === 'positive' ? 'bg-green-500' : 
                              company.sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-400'
                            }`} />
                            <Text className="text-[#666666] text-[12px] m-0 capitalize">
                              {company.sentiment}
                            </Text>
                            <Text className="text-[#666666] text-[12px] m-0">
                              ({Math.round(company.confidence * 100)}%)
                            </Text>
                          </div>
                        </Column>
                        <Column width="50%" align="right">
                          <Text className="text-[#666666] text-[12px] m-0">
                            {company.newsletter_name}
                          </Text>
                        </Column>
                      </Row>
                    </div>
                  ))}
                  
                  {companies.length > 10 && (
                    <div className="text-center mt-[20px]">
                      <Text className="text-[#666666] text-[14px] m-0">
                        + {companies.length - 10} more companies in your dashboard
                      </Text>
                      <Link
                        href="https://intelligence.substack.com/intelligence"
                        className="text-[#067df7] text-[14px] font-medium no-underline mt-2 inline-block"
                      >
                        View Full Report →
                      </Link>
                    </div>
                  )}
                </Section>
              </>
            )}
            
            {companies.length === 0 && (
              <Section className="text-center py-[40px]">
                <Text className="text-[#666666] text-[16px] leading-[24px]">
                  No new companies discovered today.
                </Text>
                <Text className="text-[#666666] text-[14px] leading-[20px] mt-2">
                  We'll continue monitoring your curated newsletters for emerging brands.
                </Text>
              </Section>
            )}

            {/* Top Newsletters */}
            {summary.topNewsletters.length > 0 && (
              <>
                <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
                <Section>
                  <Heading className="text-black text-[16px] font-semibold mt-0 mb-[12px]">
                    Active Sources Today
                  </Heading>
                  <Text className="text-[#666666] text-[14px] leading-[20px] m-0">
                    {summary.topNewsletters.slice(0, 5).join(' • ')}
                  </Text>
                </Section>
              </>
            )}

            {/* Footer */}
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Section>
              <Row>
                <Column align="center">
                  <Text className="text-[#666666] text-[12px] leading-[16px] text-center">
                    Substack Intelligence Platform
                  </Text>
                  <Text className="text-[#666666] text-[12px] leading-[16px] text-center mt-1">
                    AI-powered venture intelligence for consumer VC deal sourcing
                  </Text>
                  <div className="flex justify-center gap-4 mt-4">
                    <Link
                      href="https://intelligence.substack.com/dashboard"
                      className="text-[#067df7] text-[12px] no-underline"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="https://intelligence.substack.com/settings"
                      className="text-[#067df7] text-[12px] no-underline"
                    >
                      Settings
                    </Link>
                    <Link
                      href="https://intelligence.substack.com/unsubscribe"
                      className="text-[#666666] text-[12px] no-underline"
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