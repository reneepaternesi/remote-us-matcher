import { ExternalLink, Briefcase, Code } from 'lucide-react';
import prisma from '@/lib/prisma';
import ProfileForm from './ProfileForm';

export default async function PerfilPage() {
  let profile = await prisma.profileSettings.findUnique({ where: { id: 'default' } });
  
  if (!profile) {
    profile = await prisma.profileSettings.create({ data: { id: 'default' } });
  }

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-6 bg-black min-h-screen text-slate-200">
      
      {/* Header Profile Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] border border-cyan-400">
            <span className="text-2xl font-black text-black">RP</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Renée Paternesi 
              <span className="bg-cyan-900/40 text-cyan-400 text-sm px-3 py-1 rounded-full border border-cyan-700/50">Senior Frontend Engineer</span>
            </h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
              Mendoza, Argentina • US / EU Timezones overlay (EST / UTC-3) • reneepaternesi@gmail.com
            </p>
            <div className="flex gap-4 mt-3">
              <a href="https://linkedin.com/in/reneepaternesi" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-semibold text-cyan-500 hover:text-cyan-400">
                <Briefcase className="w-4 h-4" /> LinkedIn Profile <ExternalLink className="w-3 h-3" />
              </a>
              <a href="https://github.com/reneepaternesi" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-semibold text-cyan-500 hover:text-cyan-400">
                <Code className="w-4 h-4" /> GitHub Repos <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="bg-black/50 border border-zinc-800 rounded-xl p-5 text-right">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Experiencia Senior</div>
          <div className="text-3xl font-black text-white">+12 Años Trajectory</div>
          <div className="text-sm font-bold text-cyan-500 mt-1">C1/C2 Advanced English</div>
        </div>
      </div>

      <ProfileForm initialData={{
        minHourlyRate: profile.minHourlyRate,
        minMonthlySalary: profile.minMonthlySalary,
        directHireOnly: profile.directHireOnly,
        minContractDuration: profile.minContractDuration,
        targetRoles: profile.targetRoles,
        techStack: profile.techStack,
        excludedKeywords: profile.excludedKeywords,
        professionalSummary: profile.professionalSummary
      }} />

    </div>
  );
}
