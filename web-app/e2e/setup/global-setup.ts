import { chromium } from '@playwright/test';
import * as nodeFetch from 'node-fetch';

// Polyfill fetch for Node.js environment
if (!globalThis.fetch) {
  const g = globalThis as Record<string, unknown>;
  g.fetch    = nodeFetch.default;
  g.Headers  = nodeFetch.Headers;
  g.Request  = nodeFetch.Request;
  g.Response = nodeFetch.Response;
  g.FormData = nodeFetch.FormData;
}

async function globalSetup() {
  // Install Playwright browser if needed
  const browser = await chromium.launch();
  await browser.close();

  // Load environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY environment variable is not set');
  }
}

export default globalSetup;
