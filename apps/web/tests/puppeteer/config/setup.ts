import { mkdir } from 'fs/promises';
import path from 'path';

// Ensure test results directory exists
beforeAll(async () => {
  const testResultsDir = path.join(process.cwd(), 'test-results');
  await mkdir(testResultsDir, { recursive: true });
  console.log('📁 Test results directory ready:', testResultsDir);
});

// Set longer timeout for all tests
jest.setTimeout(120000);

// Suppress console.error for expected errors
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    // Filter out expected errors
    const errorString = args.join(' ');
    if (
      errorString.includes('NextAuth') ||
      errorString.includes('Axiom') ||
      errorString.includes('CUSTOM_KEY')
    ) {
      return; // Suppress these expected errors
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Add custom matchers if needed
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    return {
      pass,
      message: () => 
        pass 
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`
    };
  }
});