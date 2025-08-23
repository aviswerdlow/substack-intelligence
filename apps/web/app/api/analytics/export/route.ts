import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days') || '7';
    
    // Generate CSV data
    const csvData = generateCSVData(parseInt(days));
    
    // Create CSV string
    const csvString = convertToCSV(csvData);
    
    // Return as downloadable CSV file
    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="analytics-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
    
  } catch (error) {
    console.error('Failed to export analytics:', error);
    
    // Return error CSV
    const errorCSV = 'Error,Message\nExport Failed,Unable to generate analytics export';
    return new NextResponse(errorCSV, {
      status: 500,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="export-error.csv"'
      }
    });
  }
}

function generateCSVData(days: number) {
  const data = [];
  const today = new Date();
  
  // Header row
  data.push([
    'Date',
    'Companies Discovered',
    'Total Mentions',
    'Avg Confidence',
    'Top Newsletter',
    'Top Company',
    'Dominant Industry',
    'Emails Processed',
    'Success Rate'
  ]);
  
  // Generate data rows
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push([
      date.toISOString().split('T')[0],
      Math.floor(Math.random() * 10 + 5).toString(), // Companies
      Math.floor(Math.random() * 30 + 20).toString(), // Mentions
      (0.7 + Math.random() * 0.2).toFixed(2), // Confidence
      ['Stratechery', 'The Information', 'Platformer'][Math.floor(Math.random() * 3)],
      ['OpenAI', 'Anthropic', 'Stripe', 'Figma'][Math.floor(Math.random() * 4)],
      ['Technology', 'Finance', 'Healthcare'][Math.floor(Math.random() * 3)],
      Math.floor(Math.random() * 20 + 10).toString(), // Emails
      (0.85 + Math.random() * 0.1).toFixed(2) // Success rate
    ]);
  }
  
  return data;
}

function convertToCSV(data: string[][]): string {
  return data.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma or quotes
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
}