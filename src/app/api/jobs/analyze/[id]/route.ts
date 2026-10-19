import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateContentWithFallback } from '@/lib/gemini';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.analyzed) {
      return NextResponse.json({ error: 'Job already analyzed' }, { status: 400 });
    }

    let profile = await prisma.profileSettings.findUnique({
      where: { id: 'default' }
    });

    if (!profile) {
      profile = await prisma.profileSettings.create({
        data: { id: 'default' }
      });
    }

    const prompt = `
    You are an expert IT Recruiter and Career Strategist.
    Analyze the following HTML text of a remote job posting and evaluate if it's a good match for this profile:
    
    User Profile:
    - Target Roles: ${profile.targetRoles}
    - Minimum Hourly Rate: $${profile.minHourlyRate}/hr
    - Minimum Monthly Salary: $${profile.minMonthlySalary}
    - Tech Stack: ${profile.techStack}
    - Contract Preferences: ${profile.contractType}
    - Exclusions (Red Flags): ${profile.excludedKeywords}
    - Direct Hire Only: ${profile.directHireOnly ? 'Yes' : 'No'}
    - Professional Summary & Experience: ${profile.professionalSummary}
    
    Job Title: ${job.title}
    Company: ${job.company}
    Salary Info: ${job.salaryRange || 'Not Provided'}
    Job Posting HTML:
    ${(job.description || '').substring(0, 10000)}
    
    Return ONLY a JSON object with the following structure (no markdown formatting, no code blocks):
    {
      "salaryRange": "Extracted Salary or 'Not Disclosed'",
      "matchScore": 85, // Number from 0 to 100 based on fit
      "aiInsight": "A 2-3 paragraph strategic analysis. Mention if it hits any red flags, evaluates the salary, and give a final verdict (e.g., Highly Recommended, Proceed with Caution, Discard)."
    }
    `;

    const rawResult = await generateContentWithFallback(prompt);

    const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }
    const analysis = JSON.parse(jsonMatch[0]);

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        analyzed: true,
        matchScore: analysis.matchScore,
        aiInsight: analysis.aiInsight,
        salaryRange: analysis.salaryRange || job.salaryRange
      }
    });

    return NextResponse.json({ success: true, data: updatedJob });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Analyze API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
