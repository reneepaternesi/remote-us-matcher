import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateContentWithFallback } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const existingJob = await prisma.job.findFirst({ where: { url: url } });
    if (existingJob) {
      // If it exists but wasn't analyzed, we could theoretically analyze it now,
      // but to save tokens and prevent duplicate entries, we just return it.
      // The user can decide what to do with it.
      return NextResponse.json({ 
        success: true, 
        data: existingJob,
        message: 'Esta vacante ya se encontraba en tu base de datos.'
      });
    }

    // Step 1: Fetch the HTML content of the job posting
    // Note: For complex sites (like LinkedIn) this might require a headless browser,
    // but for the MVP we will do a standard fetch.
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    
    const htmlText = await response.text();

    // Step 2: Fetch user profile settings from DB to use as context
    let profile = await prisma.profileSettings.findUnique({
      where: { id: 'default' }
    });

    if (!profile) {
      profile = await prisma.profileSettings.create({
        data: { id: 'default' }
      });
    }

    // Step 3: Analyze with Gemini
    const prompt = `
      You are an expert IT Recruiter and Career Strategist.
      Analyze the following HTML text of a job posting and evaluate if it's a good match for this profile:
      
      User Profile:
      - Minimum Hourly Rate: $${profile.minHourlyRate}/hr
      - Minimum Monthly Salary: $${profile.minMonthlySalary}
      - Tech Stack: ${profile.techStack}
      - Contract Preferences: ${profile.contractType}
      - Exclusions (Red Flags): ${profile.excludedKeywords}
      - Professional Summary & Experience: ${profile.professionalSummary}
      
      Job Posting HTML:
      ${htmlText.substring(0, 15000)} // Limit context window
      
      Return ONLY a JSON object with the following structure (no markdown formatting, no code blocks):
      {
        "title": "Extracted Job Title",
        "company": "Extracted Company Name",
        "salaryRange": "Extracted Salary or 'Not Disclosed'",
        "matchScore": 85, // Number from 0 to 100 based on fit
        "aiInsight": "A 2-3 paragraph strategic analysis. Mention if it hits any red flags, evaluates the salary, and give a final verdict (e.g., Highly Recommended, Proceed with Caution, Discard).",
        "description": "The full extracted job description formatted in clean HTML (use <p>, <ul>, <li>, <strong>). Do not include headers, footers, menus, or unrelated page content."
      }
    `;

    const rawResult = await generateContentWithFallback(prompt);
    
    // Clean up potential markdown formatting and extract JSON
    const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI response did not contain valid JSON");
    }
    const analysis = JSON.parse(jsonMatch[0]);

    // Step 3.5: Secondary duplicate check based on extracted Title and Company
    const duplicateJob = await prisma.job.findFirst({
      where: {
        AND: [
          { company: analysis.company },
          { title: analysis.title }
        ]
      }
    });

    if (duplicateJob) {
      return NextResponse.json({ 
        success: true, 
        data: duplicateJob,
        message: 'Esta vacante ya se encontraba en tu base de datos (detectado por Empresa y Puesto).'
      });
    }

    // Step 4: Save the analyzed job to the database
    const savedJob = await prisma.job.create({
      data: {
        title: analysis.title,
        company: analysis.company,
        url: url,
        salaryRange: analysis.salaryRange,
        source: 'Manual Scraper',
        matchScore: analysis.matchScore,
        aiInsight: analysis.aiInsight,
        description: analysis.description,
        analyzed: true,
        status: 'AVAILABLE'
      }
    });

    return NextResponse.json({ success: true, data: savedJob });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Scraper API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
