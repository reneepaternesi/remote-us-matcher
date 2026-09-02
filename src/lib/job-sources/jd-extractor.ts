/**
 * jd-extractor.ts
 * Fetches job details from Ashby and Greenhouse using their
 * public JSON APIs (not HTML scraping, which fails due to SPA rendering).
 *
 * Flow:
 *   Serper returns URLs like:
 *     - https://jobs.ashbyhq.com/COMPANY_SLUG/JOB_ID
 *     - https://job-boards.greenhouse.io/COMPANY_SLUG/jobs/JOB_ID
 *   We extract the company slug from the URL, then call the platform JSON API
 *   to get title, description, location and salary data.
 */

export interface ScrapedJob {
  title: string;
  company: string;
  url: string;
  salaryRange: string | null;
  description: string;
  source: string;
}

// ─── Ashby ───────────────────────────────────────────────────────────────────

interface AshbyJob {
  id: string;
  title: string;
  isListed: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  location?: string;
  publishedAt?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  compensation?: {
    summaryComponents?: { label: string; minValue?: number; maxValue?: number; currencyCode?: string }[];
  };
  jobUrl?: string;
}

interface AshbyBoard {
  organizationName?: string;
  jobs?: AshbyJob[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function fetchAshbySlug(companySlug: string): Promise<ScrapedJob[]> {
  try {
    const res = await fetch(
      `https://api.ashbyhq.com/posting-api/job-board/${companySlug}?includeCompensation=true`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return [];

    const data: AshbyBoard = await res.json();
    const companyName = data.organizationName
      || companySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    return (data.jobs ?? [])
      .filter((j) => j.isListed)
      .map((j) => {
        const description = j.descriptionPlain
          || (j.descriptionHtml ? stripHtml(j.descriptionHtml) : '')
          || '';

        let salaryRange: string | null = null;
        const comp = j.compensation?.summaryComponents?.[0];
        if (comp?.minValue && comp?.maxValue) {
          salaryRange = `${comp.currencyCode ?? '$'}${comp.minValue.toLocaleString()} – ${comp.maxValue.toLocaleString()}`;
        }

        const url = j.jobUrl ?? `https://jobs.ashbyhq.com/${companySlug}/${j.id}`;

        return {
          title: j.title,
          company: companyName,
          url,
          salaryRange,
          description: description.slice(0, 4000),
          source: 'Ashby',
        };
      });
  } catch (err) {
    console.warn(`[jd-extractor] Ashby fetch failed for slug "${companySlug}":`, err);
    return [];
  }
}

// ─── Greenhouse ──────────────────────────────────────────────────────────────

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  content?: string;
  departments?: { name: string }[];
  offices?: { name: string }[];
  metadata?: { name: string; value: string | null }[];
}

interface GreenhouseBoard {
  jobs?: GreenhouseJob[];
  meta?: { total: number };
}

async function fetchGreenhouseSlug(companySlug: string): Promise<ScrapedJob[]> {
  try {
    const res = await fetch(
      `https://api.greenhouse.io/v1/boards/${companySlug}/jobs?content=true`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return [];

    const data: GreenhouseBoard = await res.json();
    const companyName = companySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    return (data.jobs ?? []).map((j) => {
      const description = j.content ? stripHtml(j.content) : '';

      // Try to extract salary from metadata
      const salaryMeta = j.metadata?.find(
        (m) => m.name?.toLowerCase().includes('salary') || m.name?.toLowerCase().includes('compensation')
      );
      const salaryRange = salaryMeta?.value ?? null;

      return {
        title: j.title,
        company: companyName,
        url: j.absolute_url,
        salaryRange,
        description: description.slice(0, 4000),
        source: 'Greenhouse',
      };
    });
  } catch (err) {
    console.warn(`[jd-extractor] Greenhouse fetch failed for slug "${companySlug}":`, err);
    return [];
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Extract company slug from an Ashby job URL */
function ashbySlugFromUrl(url: string): string | null {
  const match = url.match(/jobs\.ashbyhq\.com\/([^/]+)/);
  return match?.[1] ?? null;
}

/** Extract company slug from a Greenhouse job URL */
function greenhouseSlugFromUrl(url: string): string | null {
  // Covers job-boards.greenhouse.io/SLUG and job-boards.eu.greenhouse.io/SLUG
  const match = url.match(/greenhouse\.io\/([^/]+)/);
  return match?.[1] ?? null;
}

/**
 * Given a list of URLs from Serper (one per job), groups them by company slug
 * and fetches ALL jobs for each discovered company via the platform JSON API.
 * This is more efficient than fetching each URL individually and avoids SPA issues.
 */
export async function extractJobsFromSearchResults(
  results: { url: string; source: 'Ashby' | 'Greenhouse' }[]
): Promise<ScrapedJob[]> {
  const ashbySlugs = new Set<string>();
  const greenhouseSlugs = new Set<string>();

  for (const { url, source } of results) {
    if (source === 'Ashby') {
      const slug = ashbySlugFromUrl(url);
      if (slug) ashbySlugs.add(slug);
    } else if (source === 'Greenhouse') {
      const slug = greenhouseSlugFromUrl(url);
      if (slug) greenhouseSlugs.add(slug);
    }
  }

  console.log(`[jd-extractor] Discovered ${ashbySlugs.size} Ashby companies, ${greenhouseSlugs.size} Greenhouse companies`);

  const [ashbyResults, greenhouseResults] = await Promise.all([
    Promise.all([...ashbySlugs].map(fetchAshbySlug)),
    Promise.all([...greenhouseSlugs].map(fetchGreenhouseSlug)),
  ]);

  return [
    ...ashbyResults.flat(),
    ...greenhouseResults.flat(),
  ];
}
