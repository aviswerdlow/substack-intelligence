export * from './schemas';

// Utility functions
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    // Replace common separators/connectors with 'and'
    .replace(/\s*&\s*/g, 'and')
    .replace(/\s+and\s+/g, 'and')
    // Remove common company suffixes
    .replace(/\s*(inc\.?|llc\.?|corp\.?|ltd\.?|co\.?|company|corporation|limited|pbc)\s*$/i, '')
    // Remove parenthetical information
    .replace(/\s*\([^)]*\)\s*/g, '')
    // Remove all non-alphanumeric characters
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function calculateConfidenceScore(factors: {
  contextLength: number;
  sentimentClarity: number;
  nameRecognition: number;
}): number {
  const weights = {
    contextLength: 0.3,
    sentimentClarity: 0.4,
    nameRecognition: 0.3
  };
  
  return Math.min(1, Math.max(0, 
    factors.contextLength * weights.contextLength +
    factors.sentimentClarity * weights.sentimentClarity +
    factors.nameRecognition * weights.nameRecognition
  ));
}

export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export function deduplicateCompanies<T extends { name: string }>(companies: T[]): T[] {
  const seen = new Set<string>();
  return companies.filter(company => {
    const normalized = normalizeCompanyName(company.name);
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}