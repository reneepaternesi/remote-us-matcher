/**
 * search-engine.ts
 * Executes Google site: search queries via Serper.dev API
 * to discover job postings on Ashby and Greenhouse.
 */

export type JobSource = 'Ashby' | 'Greenhouse';

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  source: JobSource;
}

// Queries without quoted phrases — these work reliably with Serper.dev.
// Multiple variations cover the different location/scope keywords used on each platform.
// Deduplication by URL handles any overlaps between queries.
const SEARCH_QUERIES: { query: string; source: JobSource }[] = [
  // Ashby — senior frontend / React / Next.js roles that are remote
  { query: 'site:jobs.ashbyhq.com React Remote senior frontend engineer', source: 'Ashby' },
  { query: 'site:jobs.ashbyhq.com Next.js Remote frontend engineer', source: 'Ashby' },
  { query: 'site:jobs.ashbyhq.com React Worldwide frontend engineer', source: 'Ashby' },
  { query: 'site:jobs.ashbyhq.com React LATAM frontend', source: 'Ashby' },
  { query: 'site:jobs.ashbyhq.com TypeScript Remote UI Engineer', source: 'Ashby' },
  { query: 'site:jobs.ashbyhq.com Senior Product Engineer Frontend Remote', source: 'Ashby' },
  // Greenhouse — frontend / React / Next.js roles remote or open worldwide
  { query: 'site:job-boards.greenhouse.io React Remote frontend engineer', source: 'Greenhouse' },
  { query: 'site:job-boards.greenhouse.io Next.js Remote frontend', source: 'Greenhouse' },
  { query: 'site:job-boards.greenhouse.io React Anywhere frontend', source: 'Greenhouse' },
  { query: 'site:job-boards.greenhouse.io React LATAM frontend engineer', source: 'Greenhouse' },
  { query: 'site:job-boards.greenhouse.io TypeScript Remote UI Frontend', source: 'Greenhouse' },
  { query: 'site:job-boards.greenhouse.io Senior Product Engineer Frontend Remote', source: 'Greenhouse' },
];

interface SerperOrganic {
  title: string;
  link: string;
  snippet?: string;
}

interface SerperResponse {
  organic?: SerperOrganic[];
}

let lastSerperWarning: string | null = null;

export function getLastSerperWarning(): string | null {
  return lastSerperWarning;
}

export function resetSerperWarning(): void {
  lastSerperWarning = null;
}

/**
 * Runs a single Serper.dev search and returns the organic results.
 * tbs=qdr:m → last month (same as Google Tools > Past month)
 */
async function runSerperQuery(query: string, retries = 2): Promise<SerperOrganic[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.warn('[search-engine] SERPER_API_KEY is not set. Skipping search.');
    lastSerperWarning = 'SERPER_API_KEY no configurada';
    return [];
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          num: 10,      // 10 is the max that works reliably for site: queries on Serper
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let parsedMsg = errText;
        try {
          const json = JSON.parse(errText);
          parsedMsg = json.message || errText;
        } catch {}
        console.error(`[search-engine] Serper API error: ${res.status} ${res.statusText} - ${parsedMsg}`);
        if (res.status === 400 && parsedMsg.toLowerCase().includes('not enough credits')) {
          lastSerperWarning = 'Serper.dev sin créditos (renovar SERPER_API_KEY)';
        } else {
          lastSerperWarning = `Serper error ${res.status}: ${parsedMsg}`;
        }
        return [];
      }

      const data: SerperResponse = await res.json();
      return data.organic ?? [];
    } catch (err: unknown) {
      const isDnsOrNetwork =
        err instanceof Error &&
        (err.message.includes('ENOTFOUND') ||
          err.message.includes('fetch failed') ||
          err.message.includes('ECONNRESET') ||
          err.message.includes('ETIMEDOUT'));

      if (isDnsOrNetwork && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        continue;
      }

      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[search-engine] Serper query failed for "${query}": ${errMsg}`);
      return [];
    }
  }

  return [];
}

/**
 * Runs all configured queries and returns deduplicated search results
 * with their source platform tagged.
 * Queries are run in batches of 3 to avoid DNS threadpool congestion (ENOTFOUND) on macOS.
 */
export async function searchJobUrls(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const seenUrls = new Set<string>();

  const batchSize = 3;
  for (let i = 0; i < SEARCH_QUERIES.length; i += batchSize) {
    const batch = SEARCH_QUERIES.slice(i, i + batchSize);
    const batchSettled = await Promise.allSettled(
      batch.map(({ query, source }) =>
        runSerperQuery(query).then((organics) =>
          organics.map((o) => ({ url: o.link, title: o.title, snippet: o.snippet ?? '', source }))
        )
      )
    );

    for (const result of batchSettled) {
      if (result.status === 'fulfilled') {
        for (const item of result.value) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            results.push(item);
          }
        }
      }
    }
  }

  console.log(`[search-engine] Found ${results.length} unique URLs across all queries.`);
  return results;
}
