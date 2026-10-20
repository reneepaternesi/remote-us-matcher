import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function checkUrl(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'follow'
    });

    if (res.status === 404) {
      return { isOpen: false, reason: 'HTTP 404 Not Found' };
    }

    const html = await res.text();

    // Check Ashby
    if (url.includes('jobs.ashbyhq.com')) {
      const match = html.match(/window\.__appData\s*=\s*({[\s\S]*?});/);
      if (match) {
        try {
          const appData = JSON.parse(match[1]);
          if (!appData.posting || appData.posting.isListed === false) {
            return { isOpen: false, reason: 'Ashby posting not listed / null' };
          }
          return { isOpen: true, reason: 'Ashby posting active' };
        } catch {
          // parse failed, check text
        }
      }
      if (html.includes('This position is no longer available') || html.includes('Job posting is no longer active') || html.includes('no-longer-available')) {
        return { isOpen: false, reason: 'Ashby page text says closed' };
      }
    }

    // Check Greenhouse
    if (url.includes('greenhouse.io') || url.includes('gh_jid')) {
      if (html.includes('This job is no longer available') || html.includes('The job you are looking for is closed') || html.includes('Position Closed')) {
        return { isOpen: false, reason: 'Greenhouse job closed' };
      }
    }

    // Check WeWorkRemotely
    if (url.includes('weworkremotely.com')) {
      if (html.includes('This job is no longer available') || html.includes('This position has expired') || html.includes('has expired')) {
        return { isOpen: false, reason: 'WWR job expired/closed' };
      }
    }

    // Check Himalayas
    if (url.includes('himalayas.app')) {
      if (html.includes('This job is no longer active') || html.includes('This job has expired') || html.includes('No longer accepting applications') || html.includes('is no longer accepting applications')) {
        return { isOpen: false, reason: 'Himalayas job closed/expired' };
      }
    }

    // General text indicators
    const lower = html.toLowerCase();
    if (
      lower.includes('this job is no longer available') ||
      lower.includes('this position has been closed') ||
      lower.includes('this job posting has expired') ||
      lower.includes('the job you are looking for has closed') ||
      lower.includes('position closed')
    ) {
      return { isOpen: false, reason: 'Page text indicates closed' };
    }

    return { isOpen: true, reason: `Page status ${res.status}, length ${html.length}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { isOpen: false, reason: `Fetch error: ${message}` };
  }
}

async function main() {
  const jobs = await prisma.job.findMany({
    where: { status: { in: ['APPLIED', 'INTERVIEWING'] } }
  });

  console.log(`Checking ${jobs.length} jobs:\n`);
  const closedJobs = [];
  const openJobs = [];

  for (const j of jobs) {
    const res = await checkUrl(j.url);
    if (res.isOpen) {
      openJobs.push({ ...j, reason: res.reason });
      console.log(`🟢 ABIERTA: [${j.company}] ${j.title}`);
      console.log(`   URL: ${j.url}`);
    } else {
      closedJobs.push({ ...j, reason: res.reason });
      console.log(`🔴 CERRADA: [${j.company}] ${j.title}`);
      console.log(`   URL: ${j.url}`);
      console.log(`   Motivo: ${res.reason}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Resumen: ${openJobs.length} Abiertas, ${closedJobs.length} Cerradas.`);
  console.log(`========================================\n`);
}

main().catch(console.error).finally(() => process.exit(0));
