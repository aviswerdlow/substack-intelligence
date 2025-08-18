#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const Anthropic = require('@anthropic-ai/sdk');

// Test the company extraction with sample newsletter content
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Sample Substack newsletter content
const sampleContent = `
Hey everyone! 👋

This week I'm obsessing over several companies that are completely reshaping consumer behavior:

**Glossier** just raised $80M in Series E funding and they're expanding into Europe. The beauty brand has cracked the code on community-driven product development. Emily Weiss has built something truly special here.

I also had drinks with the founder of **Allbirds** last week - they're pivoting hard into the running space with their new Tree Flyer 2. Tim Brown mentioned they're seeing incredible traction with Gen Z runners who care about sustainability.

**Warby Parker** continues to dominate eyewear - their new virtual try-on tech is insane. I tried it yesterday and honestly couldn't tell the difference from trying on real glasses.

And don't sleep on **Liquid Death** - this canned water company is doing $130M ARR now. Mike Cessario has turned water into a lifestyle brand. Wild.

Also keeping an eye on:
- **Parade** (the underwear brand) - heard they're raising a Series B
- **Flamingo Estate** - this LA-based wellness brand is exploding on social media
- **Brightland** - olive oil company that's making boring pantry staples cool

That startup I mentioned last month, **Superplastic**, just got featured in Vogue. Their NFT characters are becoming real consumer brands.

Quick hits:
- **Away** launched new colors
- **Casper** is struggling but their new CEO seems promising
- **Outdoor Voices** drama continues
- **Everlane** released sustainability report

What companies are you watching? Hit reply and let me know!

-Sarah
`;

const systemPrompt = `You are an expert venture capital analyst specializing in consumer brands and startups.

Your task is to extract company mentions from newsletter content with high precision, focusing on private companies, startups, and new ventures that would be relevant for VC investment.

Return a JSON response with this exact structure:
{
  "companies": [
    {
      "name": "Company Name",
      "description": "Brief description based on context",
      "context": "The specific sentence(s) mentioning the company",
      "sentiment": "positive|negative|neutral",
      "confidence": 0.95
    }
  ],
  "summary": "Brief summary of key findings"
}

Guidelines:
- Focus on private companies, startups, and venture-backed businesses
- Include subsidiaries and spin-offs from larger companies if they represent new ventures
- Exclude well-established public companies unless they're launching new ventures
- Be conservative with confidence scores - only use high confidence (0.8+) for clear mentions
- Capture the surrounding context that explains why the company was mentioned
- Assess sentiment based on how the company is discussed (positive coverage, criticism, neutral mention)

Only extract companies that would be relevant for venture capital investment consideration.`;

async function testExtraction() {
  try {
    console.log('🔥 Testing Anthropic API Company Extraction...\n');
    console.log('📧 Sample content length:', sampleContent.length, 'characters\n');

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Using Haiku for faster testing
      max_tokens: 2000,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Extract companies from this newsletter content:\n\n${sampleContent}`
      }]
    });

    const result = JSON.parse(response.content[0].text);
    
    console.log('✅ Extraction completed successfully!\n');
    console.log('📊 Results:');
    console.log('═'.repeat(60));
    console.log(`📈 Companies found: ${result.companies.length}`);
    console.log(`💡 Summary: ${result.summary}`);
    console.log('═'.repeat(60));

    result.companies.forEach((company, index) => {
      console.log(`\n${index + 1}. ${company.name}`);
      console.log(`   Description: ${company.description}`);
      console.log(`   Sentiment: ${company.sentiment} (${company.confidence} confidence)`);
      console.log(`   Context: "${company.context.substring(0, 100)}..."`);
    });

    console.log('\n✅ Test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run the database SQL in Supabase dashboard');
    console.log('2. Start the Next.js development server');
    console.log('3. Build the manual input interface');

    return result;

  } catch (error) {
    console.error('❌ Extraction test failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Check your ANTHROPIC_API_KEY in .env.local');
    }
    
    if (error.message.includes('rate limit')) {
      console.log('\n💡 Rate limit hit - wait a moment and try again');
    }
    
    process.exit(1);
  }
}

// Run the test
testExtraction();