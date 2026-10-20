import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  const counts = await prisma.job.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('Job counts by status:');
  console.log(counts);

  const total = await prisma.job.count();
  console.log(`Total jobs in DB: ${total}`);
}

main().catch(console.error).finally(() => process.exit(0));
