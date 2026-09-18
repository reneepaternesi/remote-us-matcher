import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJobUrl, VerificationResult } from '@/lib/job-verifier';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const specificId = searchParams.get('id');

    const jobs = await prisma.job.findMany({
      where: specificId
        ? { id: specificId }
        : { status: { in: ['APPLIED', 'INTERVIEWING'] } },
      orderBy: { updatedAt: 'desc' }
    });

    const results: Array<{
      id: string;
      title: string;
      company: string;
      url: string;
      verification: VerificationResult;
    }> = [];

    // Run parallel checks in chunks of 5 to respect concurrency
    for (let i = 0; i < jobs.length; i += 5) {
      const chunk = jobs.slice(i, i + 5);
      const verifiedChunk = await Promise.all(
        chunk.map(async (j) => {
          const verification = await verifyJobUrl(j.url);
          return {
            id: j.id,
            title: j.title,
            company: j.company,
            url: j.url,
            verification
          };
        })
      );
      results.push(...verifiedChunk);
    }

    const closedCount = results.filter((r) => r.verification.status === 'CLOSED').length;
    const activeCount = results.filter((r) => r.verification.status === 'ACTIVE').length;

    return NextResponse.json({
      success: true,
      total: results.length,
      active: activeCount,
      closed: closedCount,
      results
    });
  } catch (error) {
    console.error('Error verifying applied jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Error al verificar las vacantes' },
      { status: 500 }
    );
  }
}
