'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateProfileSettings(formData: FormData) {
  const minHourlyRate = parseInt(formData.get('minHourlyRate') as string) || 45;
  const minMonthlySalary = parseInt(formData.get('minMonthlySalary') as string) || 7500;
  const directHireOnly = formData.get('directHireOnly') === 'on';
  const minContractDuration = (formData.get('minContractDuration') as string) || '';
  const targetRoles = (formData.get('targetRoles') as string) || '';
  const techStack = (formData.get('techStack') as string) || '';
  const excludedKeywords = (formData.get('excludedKeywords') as string) || '';
  const professionalSummary = (formData.get('professionalSummary') as string) || '';

  await prisma.profileSettings.upsert({
    where: { id: 'default' },
    update: {
      minHourlyRate,
      minMonthlySalary,
      directHireOnly,
      minContractDuration,
      targetRoles,
      techStack,
      excludedKeywords,
      professionalSummary,
    },
    create: {
      id: 'default',
      minHourlyRate,
      minMonthlySalary,
      directHireOnly,
      minContractDuration,
      targetRoles,
      techStack,
      excludedKeywords,
      professionalSummary,
    }
  });

  // Auto-purge old available jobs based on the new filters
  const targetRolesKeywords = targetRoles.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const techStackKeywords = techStack.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const exclusions = excludedKeywords.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

  const availableJobs = await prisma.job.findMany({
    where: { status: 'AVAILABLE' }
  });

  const jobsToDiscard = availableJobs.filter((job) => {
    const text = (String(job.title) + ' ' + (String(job.description) || '')).toLowerCase();
    const hasRole = targetRolesKeywords.some(kw => text.includes(kw));
    const hasTech = techStackKeywords.some(kw => text.includes(kw));
    const hasExclusion = exclusions.some(kw => text.includes(kw));
    
    // If it doesn't match criteria, or hits an exclusion, we discard it
    return !((hasRole || hasTech) && !hasExclusion);
  });

  if (jobsToDiscard.length > 0) {
    const jobIds = jobsToDiscard.map(j => j.id);
    await prisma.job.updateMany({
      where: { id: { in: jobIds } },
      data: { status: 'DISCARDED' }
    });
  }

  revalidatePath('/'); // Refresh dashboard
  revalidatePath('/perfil');
  return { success: true };
}
