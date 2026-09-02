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
  // Ashby — senior frontend / React roles that are remote
  { query: 'site:jobs.ashbyhq.com React Remote senior frontend engineer', source: 'Ashby' },
  { query: 'site:jobs.ashbyhq.com React Worldwide frontend engineer', source: 'Ashby' },
  { query: 'site:jobs.ashbyhq.com React LATAM frontend', source: 'Ashby' },
  // Greenhouse — frontend / React roles remote or open worldwide
  { query: 'site:job-boards.greenhouse.io React Remote frontend engineer', source: 'Greenhouse' },
  { query: 'site:job-boards.greenhouse.io React Anywhere frontend', source: 'Greenhouse' },
  { query: 'site:job-boards.greenhouse.io React LATAM frontend engineer', source: 'Greenhouse' },
];

interface SerperOrganic {
  title: string;
  link: string;
  snippet?: string;
}

interface SerperResponse {
  organic?: SerperOrganic[];
}

/**
 * Runs a single Serper.dev search and returns the organic results.
 * tbs=qdr:m → last month (same as Google Tools > Past month)
 */
async function runSerperQuery(query: string): Promise<SerperOrganic[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.warn('[search-engine] SERPER_API_KEY is not set. Skipping search.');
    return [];
  }

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
      console.error(`[search-engine] Serper API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data: SerperResponse = await res.json();
    return data.organic ?? [];
  } catch (err) {
    console.error('[search-engine] Fetch error:', err);
    return [];
  }
}

/**
 * Runs all configured queries and returns deduplicated search results
 * with their source platform tagged.
 */
export async function searchJobUrls(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const seenUrls = new Set<string>();

  // Run all queries in parallel
  const settled = await Promise.allSettled(
    SEARCH_QUERIES.map(({ query, source }) =>
      runSerperQuery(query).then((organics) =>
        organics.map((o) => ({ url: o.link, title: o.title, snippet: o.snippet ?? '', source }))
      )
    )
  );

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      for (const item of result.value) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          results.push(item);
        }
      }
    }
  }

  console.log(`[search-engine] Found ${results.length} unique URLs across all queries.`);
  return results;
}
