import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  const jobs = await prisma.job.findMany({
    where: { status: { in: ['APPLIED', 'INTERVIEWING'] } },
    orderBy: { updatedAt: 'desc' }
  });

  console.log(`Found ${jobs.length} jobs:`);
  for (const j of jobs) {
    console.log(JSON.stringify({ id: j.id, company: j.company, title: j.title, url: j.url, status: j.status }));
  }
}

main().catch(console.error).finally(() => process.exit(0));
