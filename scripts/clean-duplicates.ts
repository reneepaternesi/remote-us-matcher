import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  const idsToDelete = [
    'cmtyemc5f00004iryhfrlg4r5', // Hire Hangar duplicate (Himalayas)
    'cmupradli000hcyryf0iq87ay'  // Makai Labs duplicate (Ashby)
  ];

  const deleted = await prisma.job.deleteMany({
    where: {
      id: { in: idsToDelete }
    }
  });

  console.log(`Eliminadas ${deleted.count} vacantes duplicadas.`);

  const remaining = await prisma.job.findMany({
    where: { status: { in: ['APPLIED', 'INTERVIEWING'] } },
    orderBy: { updatedAt: 'desc' }
  });

  console.log(`\nVacantes postuladas restantes (${remaining.length}):`);
  remaining.forEach((j, i) => {
    console.log(`${i + 1}. [${j.company}] ${j.title} -> ${j.url}`);
  });
}

main().catch(console.error).finally(() => process.exit(0));
