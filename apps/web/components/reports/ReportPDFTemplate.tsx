import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
  },
  header: {
    marginBottom: 30,
    borderBottom: '2pt solid #000000',
    paddingBottom: 20,
  },
  logo: {
    width: 150,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000000',
    borderBottom: '1pt solid #E5E7EB',
    paddingBottom: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statBox: {
    flex: 1,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  companyItem: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#FFFFFF',
    border: '1pt solid #E5E7EB',
    borderRadius: 8,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  companyBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  companyBadgeText: {
    fontSize: 10,
    color: '#2563EB',
  },
  companyDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 1.5,
  },
  mentionItem: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderLeft: '3pt solid #2563EB',
  },
  mentionContext: {
    fontSize: 11,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 5,
    lineHeight: 1.4,
  },
  mentionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  mentionMetaText: {
    fontSize: 10,
    color: '#6B7280',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1pt solid #E5E7EB',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 10,
    color: '#6B7280',
  },
  pageNumber: {
    fontSize: 10,
    color: '#6B7280',
  },
});

interface ReportData {
  reportType: 'daily' | 'weekly' | 'monthly';
  reportDate: string;
  generatedAt: string;
  stats: {
    totalCompanies: number;
    totalMentions: number;
    avgSentiment: number;
    newslettersCovered: number;
  };
  companies: Array<{
    name: string;
    description?: string;
    fundingStatus?: string;
    mentions: Array<{
      context: string;
      sentiment: 'positive' | 'negative' | 'neutral';
      confidence: number;
      newsletterName: string;
      receivedAt: string;
    }>;
  }>;
}

export const ReportPDFTemplate: React.FC<{ data: ReportData }> = ({ data }) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '#10B981';
      case 'negative':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {data.reportType.charAt(0).toUpperCase() + data.reportType.slice(1)} Intelligence Report
          </Text>
          <Text style={styles.subtitle}>
            Report Date: {formatDate(data.reportDate)}
          </Text>
          <Text style={styles.subtitle}>
            Generated: {formatTime(data.generatedAt)}
          </Text>
        </View>

        {/* Statistics */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.stats.totalCompanies}</Text>
            <Text style={styles.statLabel}>Companies</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.stats.totalMentions}</Text>
            <Text style={styles.statLabel}>Mentions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.stats.newslettersCovered}</Text>
            <Text style={styles.statLabel}>Newsletters</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {data.stats.avgSentiment > 0 ? '+' : ''}{(data.stats.avgSentiment * 100).toFixed(0)}%
            </Text>
            <Text style={styles.statLabel}>Avg Sentiment</Text>
          </View>
        </View>

        {/* Companies Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Intelligence</Text>
          
          {data.companies.map((company, index) => (
            <View key={index} style={styles.companyItem} wrap={false}>
              <View style={styles.companyHeader}>
                <Text style={styles.companyName}>{company.name}</Text>
                {company.fundingStatus && (
                  <View style={styles.companyBadge}>
                    <Text style={styles.companyBadgeText}>
                      {company.fundingStatus.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              
              {company.description && (
                <Text style={styles.companyDescription}>{company.description}</Text>
              )}
              
              {/* Mentions */}
              {company.mentions.slice(0, 3).map((mention, mentionIndex) => (
                <View key={mentionIndex} style={styles.mentionItem}>
                  <Text style={styles.mentionContext}>"{mention.context}"</Text>
                  <View style={styles.mentionMeta}>
                    <Text style={[styles.mentionMetaText, { color: getSentimentColor(mention.sentiment) }]}>
                      {mention.sentiment.toUpperCase()} ({Math.round(mention.confidence * 100)}%)
                    </Text>
                    <Text style={styles.mentionMetaText}>
                      {mention.newsletterName} • {formatDate(mention.receivedAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            © 2024 Substack Intelligence Platform
          </Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};