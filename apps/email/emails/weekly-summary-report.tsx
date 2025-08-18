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

interface WeeklySummaryData {
  weekOf: string;
  totalCompanies: number;
  totalMentions: number;
  topCompanies: Array<{
    name: string;
    mentionCount: number;
    sentiment: string;
    newsletters: string[];
  }>;
  trendingIndustries: string[];
  topNewsletters: Array<{
    name: string;
    companyCount: number;
  }>;
  insights: string[];
}

interface WeeklySummaryReportProps {
  data: WeeklySummaryData;
}

export default function WeeklySummaryReport({
  data = {
    weekOf: new Date().toLocaleDateString(),
    totalCompanies: 0,
    totalMentions: 0,
    topCompanies: [],
    trendingIndustries: [],
    topNewsletters: [],
    insights: []
  }
}: WeeklySummaryReportProps) {
  const previewText = `Weekly Intelligence • ${data.totalCompanies} companies • ${data.totalMentions} mentions`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[600px]">
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
                  <Heading className="text-black text-[28px] font-normal text-center p-0 my-[30px] mx-0">
                    Weekly Intelligence Summary
                  </Heading>
                  <Text className="text-[#666666] text-[16px] leading-[24px] text-center">
                    Week of {data.weekOf} • Venture Intelligence Insights
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Key Metrics */}
            <Section className="my-[32px]">
              <div className="bg-gradient-to-r from-[#f6f9fc] to-[#e8f4fd] border border-solid border-[#e1e8ed] rounded-lg p-[24px]">
                <Heading className="text-black text-[20px] font-semibold mt-0 mb-[20px] text-center">
                  This Week's Intelligence
                </Heading>
                <Row>
                  <Column width="25%" className="text-center">
                    <Text className="text-[36px] font-bold text-black m-0 leading-none">
                      {data.totalCompanies}
                    </Text>
                    <Text className="text-[14px] text-[#666666] mt-2 mb-0">
                      Companies Discovered
                    </Text>
                  </Column>
                  <Column width="25%" className="text-center">
                    <Text className="text-[36px] font-bold text-black m-0 leading-none">
                      {data.totalMentions}
                    </Text>
                    <Text className="text-[14px] text-[#666666] mt-2 mb-0">
                      Total Mentions
                    </Text>
                  </Column>
                  <Column width="25%" className="text-center">
                    <Text className="text-[36px] font-bold text-black m-0 leading-none">
                      {data.topNewsletters.length}
                    </Text>
                    <Text className="text-[14px] text-[#666666] mt-2 mb-0">
                      Active Sources
                    </Text>
                  </Column>
                  <Column width="25%" className="text-center">
                    <Text className="text-[36px] font-bold text-black m-0 leading-none">
                      {data.trendingIndustries.length}
                    </Text>
                    <Text className="text-[14px] text-[#666666] mt-2 mb-0">
                      Industries
                    </Text>
                  </Column>
                </Row>
              </div>
            </Section>

            {/* Top Companies */}
            {data.topCompanies.length > 0 && (
              <>
                <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
                <Section>
                  <Heading className="text-black text-[20px] font-semibold mt-0 mb-[20px]">
                    🏆 Most Mentioned Companies
                  </Heading>
                  
                  {data.topCompanies.slice(0, 5).map((company, index) => (
                    <div key={index} className="mb-[20px] p-[16px] bg-[#f8f9fa] rounded-lg border border-solid border-[#e9ecef]">
                      <Row>
                        <Column width="60%">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                              <Text className="text-white font-bold text-[12px] m-0">
                                {index + 1}
                              </Text>
                            </div>
                            <Text className="text-black text-[16px] font-semibold m-0">
                              {company.name}
                            </Text>
                          </div>
                        </Column>
                        <Column width="40%" align="right">
                          <Text className="text-black text-[18px] font-bold m-0">
                            {company.mentionCount} mentions
                          </Text>
                          <Text className="text-[#666666] text-[12px] mt-1 mb-0 capitalize">
                            {company.sentiment} sentiment
                          </Text>
                        </Column>
                      </Row>
                      <Row className="mt-2">
                        <Column>
                          <Text className="text-[#666666] text-[13px] m-0">
                            Sources: {company.newsletters.join(', ')}
                          </Text>
                        </Column>
                      </Row>
                    </div>
                  ))}
                </Section>
              </>
            )}

            {/* Trending Industries */}
            {data.trendingIndustries.length > 0 && (
              <>
                <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
                <Section>
                  <Heading className="text-black text-[18px] font-semibold mt-0 mb-[16px]">
                    📈 Trending Industries
                  </Heading>
                  <div className="flex flex-wrap gap-2">
                    {data.trendingIndustries.slice(0, 8).map((industry, index) => (
                      <span
                        key={index}
                        className="inline-block bg-[#e3f2fd] text-[#1976d2] px-3 py-1 rounded-full text-[12px] font-medium"
                      >
                        {industry}
                      </span>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* Top Sources */}
            {data.topNewsletters.length > 0 && (
              <>
                <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
                <Section>
                  <Heading className="text-black text-[18px] font-semibold mt-0 mb-[16px]">
                    📰 Most Active Sources
                  </Heading>
                  <div className="grid grid-cols-2 gap-4">
                    {data.topNewsletters.slice(0, 6).map((newsletter, index) => (
                      <div key={index} className="bg-[#f8f9fa] p-3 rounded border border-solid border-[#e9ecef]">
                        <Text className="text-black text-[14px] font-medium m-0">
                          {newsletter.name}
                        </Text>
                        <Text className="text-[#666666] text-[12px] mt-1 mb-0">
                          {newsletter.companyCount} companies
                        </Text>
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* Key Insights */}
            {data.insights.length > 0 && (
              <>
                <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
                <Section>
                  <Heading className="text-black text-[18px] font-semibold mt-0 mb-[16px]">
                    💡 Key Insights
                  </Heading>
                  {data.insights.map((insight, index) => (
                    <div key={index} className="mb-3 flex items-start gap-3">
                      <div className="w-2 h-2 bg-[#007ee6] rounded-full mt-2 flex-shrink-0" />
                      <Text className="text-[#374151] text-[14px] leading-[20px] m-0">
                        {insight}
                      </Text>
                    </div>
                  ))}
                </Section>
              </>
            )}

            {/* Call to Action */}
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Section className="text-center py-[20px]">
              <Text className="text-black text-[16px] font-medium mb-4">
                Ready to dive deeper?
              </Text>
              <Link
                href="https://intelligence.substack.com/intelligence"
                className="bg-black text-white px-6 py-3 rounded text-[14px] font-medium no-underline inline-block"
              >
                View Full Intelligence Dashboard →
              </Link>
            </Section>

            {/* Footer */}
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Section>
              <Row>
                <Column align="center">
                  <Text className="text-[#666666] text-[12px] leading-[16px] text-center">
                    Substack Intelligence Platform
                  </Text>
                  <Text className="text-[#666666] text-[12px] leading-[16px] text-center mt-1">
                    Weekly insights from 26+ curated newsletters
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