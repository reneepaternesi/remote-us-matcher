/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface ScrapedJob {
  title: string;
  company: string;
  url: string;
  salaryRange: string | null;
  description: string;
  source: string;
}

export async function POST() {
  try {
    let profile = await prisma.profileSettings.findUnique({
      where: { id: 'default' }
    });

    if (!profile) {
      profile = await prisma.profileSettings.create({
        data: { id: 'default' }
      });
    }

    // Build filter keywords from profile
    const targetRolesKeywords = profile.targetRoles.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const techStackKeywords = profile.techStack.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const exclusions = profile.excludedKeywords.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

    const allJobs: ScrapedJob[] = [];

    // Parallel fetch from all open JSON APIs
    const fetches = await Promise.allSettled([
      fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=50').then(res => res.json()),
      fetch('https://jobicy.com/api/v2/remote-jobs?get=development').then(res => res.json()),
      fetch('https://www.arbeitnow.com/api/job-board-api').then(res => res.json()),
      fetch('https://remoteok.com/api?tag=dev').then(res => res.json()).catch(() => []), // RemoteOK blocks some user-agents
      fetch('https://himalayas.app/jobs/api?limit=50').then(res => res.json()).catch(() => [])
    ]);

    // Parse Remotive
    if (fetches[0].status === 'fulfilled' && (fetches[0].value as any).jobs) {
      const parsed = (fetches[0].value as any).jobs.map((j: any) => ({
        title: j.title,
        company: j.company_name,
        url: j.url,
        salaryRange: j.salary || null,
        description: j.description,
        source: 'Remotive'
      }));
      allJobs.push(...parsed);
    }

    // Parse Jobicy
    if (fetches[1].status === 'fulfilled' && (fetches[1].value as any).jobs) {
      const parsed = (fetches[1].value as any).jobs.map((j: any) => ({
        title: j.jobTitle,
        company: j.companyName,
        url: j.url,
        salaryRange: j.annualSalaryMax ? `$${j.annualSalaryMin} - $${j.annualSalaryMax}` : null,
        description: j.jobDescription,
        source: 'Jobicy'
      }));
      allJobs.push(...parsed);
    }

    // Parse Arbeitnow
    if (fetches[2].status === 'fulfilled' && (fetches[2].value as any).data) {
      const parsed = (fetches[2].value as any).data.map((j: any) => ({
        title: j.title,
        company: j.company_name,
        url: j.url,
        salaryRange: null,
        description: j.description,
        source: 'Arbeitnow'
      }));
      allJobs.push(...parsed);
    }

    // Parse RemoteOK (Array format, first item is legal/stat object)
    if (fetches[3].status === 'fulfilled' && Array.isArray(fetches[3].value) && fetches[3].value.length > 1) {
      const jobsOnly = fetches[3].value.slice(1);
      const parsed = jobsOnly.map((j: any) => ({
        title: j.position,
        company: j.company,
        url: j.url,
        salaryRange: j.salary_max ? `$${j.salary_min} - $${j.salary_max}` : null,
        description: j.description,
        source: 'RemoteOK'
      }));
      allJobs.push(...parsed);
    }

    // Parse Himalayas
    if (fetches[4].status === 'fulfilled' && (fetches[4].value as any).jobs) {
      const parsed = (fetches[4].value as any).jobs.map((j: any) => ({
        title: j.title,
        company: j.companyName,
        url: j.applicationLink || j.url,
        salaryRange: j.salaryRange || null,
        description: j.description,
        source: 'Himalayas'
      }));
      allJobs.push(...parsed);
    }

    // Hardcoded aggressive exclusions for Staffing Agencies and W2 requirements
    const agencyExclusions = ['bairesdev', 'turing', 'crossover', 'toptal', 'globant', 'epam', 'nearshore business solutions', 'staff augmentation', 'staffing agency', 'recruitment agency', 'outsourcing'];
    const w2Exclusions = ['w2', 'w-2', 'us citizen', 'green card', 'security clearance', 'ts/sci', 'must reside in the us', 'must reside in the united states', 'only us residents', 'only us-based'];

    // Initial naive local filtering + Aggressive Anti-Agency/Anti-W2
    const filteredJobs = allJobs.filter((job) => {
      const text = (String(job.title) + ' ' + String(job.company) + ' ' + (String(job.description) || '')).toLowerCase();
      
      // Must NOT contain any W2 or Agency keywords
      const isAgency = agencyExclusions.some(kw => text.includes(kw));
      const requiresW2 = w2Exclusions.some(kw => text.includes(kw));
      
      // Must NOT contain user-defined exclusions
      const hasExclusion = exclusions.some(kw => text.includes(kw));

      if (isAgency || requiresW2 || hasExclusion) {
        return false; // Silently discard
      }

      // Must contain at least one target role OR tech stack keyword
      const hasRole = targetRolesKeywords.some(kw => text.includes(kw));
      const hasTech = techStackKeywords.some(kw => text.includes(kw));
      
      return hasRole || hasTech;
    });

    let savedCount = 0;

    for (const job of filteredJobs) {
      try {
        const exists = await prisma.job.findFirst({ 
          where: { 
            OR: [
              { url: job.url },
              {
                AND: [
                  { company: job.company },
                  { title: job.title }
                ]
              }
            ]
          } 
        });
        if (exists) continue;

        await prisma.job.create({
          data: {
            title: job.title,
            company: job.company,
            url: job.url,
            salaryRange: job.salaryRange || 'No revelado',
            description: job.description || '',
            source: job.source,
            status: 'AVAILABLE',
            analyzed: false,
            matchScore: 0,
            aiInsight: null
          }
        });
        savedCount++;
      } catch (e) {
        console.error('Error saving job from aggregate:', e);
      }
    }

    return NextResponse.json({ success: true, processedCount: savedCount, sources: ['Remotive', 'Jobicy', 'Arbeitnow', 'RemoteOK', 'Himalayas'] });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Fetch Feeds API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
