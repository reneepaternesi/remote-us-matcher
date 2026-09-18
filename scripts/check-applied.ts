import 'dotenv/config';
import prisma from '@/lib/prisma';

async function testUrl(url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeout);

    if (res.status === 404) {
      return { status: 'CLOSED_404', code: 404 };
    }
    
    const html = await res.text();
    const lower = html.toLowerCase();
    
    if (
      lower.includes('this job is no longer available') ||
      lower.includes('this position has been closed') ||
      lower.includes('no longer accepting applications') ||
      lower.includes('job posting is no longer active') ||
      lower.includes('this job posting has expired') ||
      lower.includes('the job you are looking for has closed') ||
      lower.includes('position closed')
    ) {
      return { status: 'CLOSED_TEXT', code: res.status, reason: 'Page text says closed/expired' };
    }

    if (lower.includes('application') || lower.includes('apply for this job') || lower.includes('first name') || lower.includes('apply now') || html.length > 5000) {
      return { status: 'ACTIVE', code: res.status, length: html.length };
    }

    return { status: 'UNKNOWN', code: res.status, length: html.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { status: 'ERROR', message };
  }
}

async function main() {
  const jobs = await prisma.job.findMany({
    where: {
      status: { in: ['APPLIED', 'INTERVIEWING'] }
    },
    orderBy: { updatedAt: 'desc' }
  });

  console.log(`\n========================================================================`);
  console.log(`Verificando las ${jobs.length} vacantes marcadas como APPLIED / INTERVIEWING`);
  console.log(`========================================================================\n`);

  const results = [];

  for (const j of jobs) {
    const check = await testUrl(j.url);
    results.push({ ...j, check });
    
    const icon = check.status === 'ACTIVE' ? '🟢 ABIERTA' : (check.status.startsWith('CLOSED') ? '🔴 CERRADA' : '🟡 ' + check.status);
    console.log(`${icon} | ${j.company} - ${j.title}`);
    console.log(`   URL: ${j.url}`);
    if (check.reason) console.log(`   Detalle: ${check.reason}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => process.exit(0));
