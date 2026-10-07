import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJobUrl, calculateBusinessDays, VerificationResult } from '@/lib/job-verifier';

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

    const now = new Date();

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
          
          const createdDate = new Date(j.createdAt);
          const businessDays = calculateBusinessDays(createdDate, now);
          const calendarDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          
          verification.businessDaysElapsed = businessDays;
          verification.daysElapsed = calendarDays;

          // Rule: 10 business days TTL for unresponded APPLIED status
          if (j.status === 'APPLIED' && businessDays >= 10) {
            verification.isTtlExpired = true;
            if (verification.status !== 'CLOSED') {
              verification.status = 'CLOSED';
              verification.reason = `Vencida por regla TTL (${businessDays} días hábiles sin respuesta)`;
            } else {
              verification.reason = `${verification.reason || 'Oferta cerrada'} · Vencida por TTL (${businessDays} días hábiles)`;
            }
          }

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
    const ttlExpiredCount = results.filter((r) => r.verification.isTtlExpired).length;
    const activeCount = results.filter((r) => r.verification.status === 'ACTIVE').length;

    return NextResponse.json({
      success: true,
      total: results.length,
      active: activeCount,
      closed: closedCount,
      ttlExpired: ttlExpiredCount,
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
