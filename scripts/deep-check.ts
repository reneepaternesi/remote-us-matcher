import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function verifyAshby(slug: string, id: string) {
  try {
    const res = await fetch('https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        operationName: 'ApiJobPosting',
        variables: {
          organizationHostedJobsPageName: slug,
          jobPostingId: id
        },
        query: `query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
          jobPosting(
            organizationHostedJobsPageName: $organizationHostedJobsPageName
            jobPostingId: $jobPostingId
          ) {
            id
            title
            isListed
            isConfidential
          }
        }`
      })
    });
    const data = await res.json();
    return data?.data?.jobPosting;
  } catch {
    return null;
  }
}

async function main() {
  const jobs = await prisma.job.findMany({
    where: { status: { in: ['APPLIED', 'INTERVIEWING'] } }
  });

  console.log(`Deep inspecting all 13 jobs:\n`);

  for (const j of jobs) {
    if (j.url.includes('jobs.ashbyhq.com')) {
      const parts = j.url.split('jobs.ashbyhq.com/')[1].split('/');
      const slug = parts[0];
      const jobId = parts[1];
      const ashbyData = await verifyAshby(slug, jobId);
      if (!ashbyData || ashbyData.isListed === false) {
        console.log(`🔴 CERRADA (Ashby API): [${j.company}] ${j.title} (ID: ${j.id})`);
        console.log(`   URL: ${j.url}`);
        console.log(`   Data:`, ashbyData);
      } else {
        console.log(`🟢 ABIERTA (Ashby API): [${j.company}] ${j.title} (ID: ${j.id})`);
      }
    } else {
      console.log(`ℹ️ OTRO PORTAL: [${j.company}] ${j.title} -> ${j.url}`);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
