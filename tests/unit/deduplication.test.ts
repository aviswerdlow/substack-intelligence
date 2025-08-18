import { describe, it, expect } from 'vitest';
import { normalizeCompanyName, deduplicateCompanies } from '@substack-intelligence/shared';

describe('Company Deduplication Utils', () => {
  describe('normalizeCompanyName', () => {
    it('should normalize company names consistently', () => {
      expect(normalizeCompanyName('Glossier Inc.')).toBe('glossierinc');
      expect(normalizeCompanyName('Warby Parker')).toBe('warbyparker');
      expect(normalizeCompanyName('Away Travel, LLC')).toBe('awaytravelllc');
      expect(normalizeCompanyName('Allbirds (PBC)')).toBe('allbirdspbc');
    });

    it('should handle special characters and spaces', () => {
      expect(normalizeCompanyName('Re/code Media')).toBe('recodemedia');
      expect(normalizeCompanyName('Dollar Shave Club')).toBe('dollarshaveclub');
      expect(normalizeCompanyName('23&Me')).toBe('23me');
      expect(normalizeCompanyName('Uber Technologies, Inc.')).toBe('ubertechnologiesinc');
    });

    it('should handle empty and whitespace-only strings', () => {
      expect(normalizeCompanyName('')).toBe('');
      expect(normalizeCompanyName('   ')).toBe('');
      expect(normalizeCompanyName('\t\n')).toBe('');
    });

    it('should be case insensitive', () => {
      expect(normalizeCompanyName('GLOSSIER')).toBe('glossier');
      expect(normalizeCompanyName('glossier')).toBe('glossier');
      expect(normalizeCompanyName('GlOsSiEr')).toBe('glossier');
    });
  });

  describe('deduplicateCompanies', () => {
    interface TestCompany {
      name: string;
      description?: string;
      mentions?: number;
    }

    it('should remove exact duplicates', () => {
      const companies: TestCompany[] = [
        { name: 'Glossier', description: 'Beauty brand' },
        { name: 'Glossier', description: 'Different description' },
        { name: 'Warby Parker', description: 'Eyewear company' }
      ];

      const deduplicated = deduplicateCompanies(companies);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated.map(c => c.name)).toEqual(['Glossier', 'Warby Parker']);
    });

    it('should remove companies with different formatting but same normalized name', () => {
      const companies: TestCompany[] = [
        { name: 'Glossier Inc.' },
        { name: 'GLOSSIER INC' },
        { name: 'glossier inc.' },
        { name: 'Warby Parker' }
      ];

      const deduplicated = deduplicateCompanies(companies);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated.map(c => c.name)).toEqual(['Glossier Inc.', 'Warby Parker']);
    });

    it('should preserve the first occurrence of duplicate companies', () => {
      const companies: TestCompany[] = [
        { name: 'Glossier', mentions: 5 },
        { name: 'Warby Parker', mentions: 3 },
        { name: 'glossier inc.', mentions: 10 }, // Should be deduplicated
        { name: 'Away Travel', mentions: 2 }
      ];

      const deduplicated = deduplicateCompanies(companies);

      expect(deduplicated).toHaveLength(3);
      expect(deduplicated[0]).toEqual({ name: 'Glossier', mentions: 5 });
      expect(deduplicated.map(c => c.name)).toEqual(['Glossier', 'Warby Parker', 'Away Travel']);
    });

    it('should handle empty arrays', () => {
      const deduplicated = deduplicateCompanies([]);
      expect(deduplicated).toHaveLength(0);
    });

    it('should handle single company', () => {
      const companies: TestCompany[] = [
        { name: 'Glossier' }
      ];

      const deduplicated = deduplicateCompanies(companies);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].name).toBe('Glossier');
    });

    it('should handle companies with similar but distinct names', () => {
      const companies: TestCompany[] = [
        { name: 'Glossier' },
        { name: 'Glossier Labs' }, // Different company
        { name: 'The Glossier Company' }, // Different company
        { name: 'glossier' } // Same as first
      ];

      const deduplicated = deduplicateCompanies(companies);

      expect(deduplicated).toHaveLength(3);
      expect(deduplicated.map(c => c.name)).toEqual([
        'Glossier', 
        'Glossier Labs', 
        'The Glossier Company'
      ]);
    });

    it('should handle companies with special characters consistently', () => {
      const companies: TestCompany[] = [
        { name: '23andMe' },
        { name: '23 and Me' },
        { name: '23&Me' },
        { name: 'Uber' }
      ];

      const deduplicated = deduplicateCompanies(companies);

      // All variations of 23andMe should be considered the same
      expect(deduplicated).toHaveLength(2);
      expect(deduplicated.map(c => c.name)).toEqual(['23andMe', 'Uber']);
    });

    it('should work with complex company objects', () => {
      interface ComplexCompany {
        id: string;
        name: string;
        description: string;
        funding: string;
        mentions: Array<{
          source: string;
          confidence: number;
        }>;
      }

      const companies: ComplexCompany[] = [
        {
          id: '1',
          name: 'Glossier',
          description: 'Beauty brand',
          funding: 'Series E',
          mentions: [{ source: 'Newsletter A', confidence: 0.9 }]
        },
        {
          id: '2', 
          name: 'glossier inc.',
          description: 'Different description',
          funding: 'Different funding info',
          mentions: [{ source: 'Newsletter B', confidence: 0.8 }]
        },
        {
          id: '3',
          name: 'Warby Parker',
          description: 'Eyewear company',
          funding: 'Public',
          mentions: [{ source: 'Newsletter C', confidence: 0.95 }]
        }
      ];

      const deduplicated = deduplicateCompanies(companies);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].id).toBe('1'); // First occurrence preserved
      expect(deduplicated[0].name).toBe('Glossier');
      expect(deduplicated[0].funding).toBe('Series E'); // Original data preserved
      expect(deduplicated[1].name).toBe('Warby Parker');
    });
  });

  describe('edge cases and performance', () => {
    it('should handle large datasets efficiently', () => {
      const companies = Array.from({ length: 10000 }, (_, i) => ({
        name: i < 5000 ? `Company ${Math.floor(i / 2)}` : `Unique Company ${i}`,
        id: i.toString()
      }));

      const start = Date.now();
      const deduplicated = deduplicateCompanies(companies);
      const end = Date.now();

      // Should complete in reasonable time (less than 100ms for 10k items)
      expect(end - start).toBeLessThan(100);
      
      // Should have ~7500 unique companies (2500 duplicates + 5000 unique)
      expect(deduplicated.length).toBe(7500);
    });

    it('should handle unicode and international company names', () => {
      const companies = [
        { name: 'Société Générale' },
        { name: 'SOCIÉTÉ GÉNÉRALE' },
        { name: 'société générale' },
        { name: 'Nike 日本' },
        { name: 'NIKE 日本' },
        { name: 'Different Company' }
      ];

      const deduplicated = deduplicateCompanies(companies);

      expect(deduplicated).toHaveLength(3);
      expect(deduplicated.map(c => c.name)).toEqual([
        'Société Générale',
        'Nike 日本', 
        'Different Company'
      ]);
    });
  });
});