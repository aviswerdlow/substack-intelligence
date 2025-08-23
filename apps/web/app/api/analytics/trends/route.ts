import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    
    // Generate mock trend data
    const trends = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Generate realistic looking data with some variation
      const baseCompanies = 8;
      const baseMentions = 15;
      const baseConfidence = 0.75;
      
      trends.push({
        date: date.toISOString().split('T')[0],
        companies: baseCompanies + Math.floor(Math.random() * 5) - 2,
        mentions: baseMentions + Math.floor(Math.random() * 10) - 5,
        confidence: Math.min(1, Math.max(0, baseConfidence + (Math.random() * 0.2 - 0.1)))
      });
    }
    
    return NextResponse.json({
      success: true,
      trends
    });
    
  } catch (error) {
    console.error('Failed to fetch trends:', error);
    
    // Return mock data even on error
    const trends = [];
    const days = 7;
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        companies: 5 + Math.floor(Math.random() * 8),
        mentions: 10 + Math.floor(Math.random() * 15),
        confidence: 0.6 + Math.random() * 0.3
      });
    }
    
    return NextResponse.json({
      success: true,
      trends
    });
  }
}