'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function discardJob(jobId: string) {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'DISCARDED' }
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error discarding job:', error);
    return { success: false, error: 'No se pudo descartar la vacante' };
  }
}

export async function updateJobStatus(jobId: string, status: string) {
  try {
    // Determine which enum value to use based on the string passed
    // Options: APPLIED, INTERVIEWING, OFFER_RECEIVED, REJECTED, DISCARDED
    
    // We map frontend column IDs to Prisma Enums
    const statusMap: Record<string, string> = {
      'enviada': 'APPLIED',
      'entrevista': 'INTERVIEWING',
      'oferta': 'OFFER_RECEIVED',
      'descartada': 'REJECTED',
      'cerrada': 'CLOSED',
      // If passed directly
      'APPLIED': 'APPLIED',
      'INTERVIEWING': 'INTERVIEWING',
      'OFFER_RECEIVED': 'OFFER_RECEIVED',
      'REJECTED': 'REJECTED',
      'CLOSED': 'CLOSED'
    };

    const targetStatus = statusMap[status] || 'APPLIED';

    await prisma.job.update({
      where: { id: jobId },
      data: { status: targetStatus }
    });
    
    revalidatePath('/');
    revalidatePath('/postulaciones');
    return { success: true };
  } catch (error) {
    console.error('Error updating job status:', error);
    return { success: false, error: 'No se pudo actualizar el estado de la vacante' };
  }
}

export async function moveClosedJobs(closedInput: string[] | Array<{ id: string; reason?: string }>) {
  try {
    if (closedInput.length === 0) return { success: true, count: 0 };
    
    if (typeof closedInput[0] === 'string') {
      const ids = closedInput as string[];
      await prisma.job.updateMany({
        where: { id: { in: ids } },
        data: { status: 'CLOSED' }
      });
      revalidatePath('/');
      revalidatePath('/postulaciones');
      return { success: true, count: ids.length };
    } else {
      const items = closedInput as Array<{ id: string; reason?: string }>;
      await Promise.all(
        items.map(item =>
          prisma.job.update({
            where: { id: item.id },
            data: {
              status: 'CLOSED',
              notes: item.reason ? item.reason : undefined
            }
          })
        )
      );
      revalidatePath('/');
      revalidatePath('/postulaciones');
      return { success: true, count: items.length };
    }
  } catch (error) {
    console.error('Error moving closed jobs:', error);
    return { success: false, error: 'No se pudieron mover las vacantes cerradas' };
  }
}

export async function updateJobNotes(jobId: string, notes: string) {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: { notes }
    });
    revalidatePath('/');
    revalidatePath('/postulaciones');
    return { success: true };
  } catch (error) {
    console.error('Error updating job notes:', error);
    return { success: false, error: 'No se pudo guardar la nota' };
  }
}

