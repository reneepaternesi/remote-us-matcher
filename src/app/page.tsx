export const dynamic = 'force-dynamic';
import { FileSearch, DollarSign, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import prisma from '@/lib/prisma';
import DashboardJobs from '@/components/DashboardJobs';

export default async function Home() {
  const [profile, jobs] = await Promise.all([
    prisma.profileSettings.findUnique({ where: { id: 'default' } }),
    prisma.job.findMany({
      where: { status: 'AVAILABLE' },
      orderBy: { matchScore: 'desc' },
    }),
  ]);

  const minRate = profile?.minHourlyRate ?? 45;

  const realApplicationsCount = await prisma.job.count({
    where: { status: { in: ['APPLIED', 'INTERVIEWING'] } },
  });

  const pendingAnalysisCount = jobs.filter((j) => !j.analyzed).length;

  // Parse salary string to an hourly equivalent for comparison
  const parseSalaryToHourly = (salaryRange: string | null): number | null => {
    if (!salaryRange) return null;
    const hrMatch = salaryRange.match(/\$?([\d,]+)\s*\/\s*hr/i);
    if (hrMatch) return parseInt(hrMatch[1].replace(',', ''));
    const yearMatch = salaryRange.match(/\$?([\d,]+)k?\s*\/?\s*year/i);
    if (yearMatch) return Math.round((parseInt(yearMatch[1].replace(',', '')) * 1000) / 2080);
    const kStandalone = salaryRange.match(/\$?([\d,]+)k/i);
    if (kStandalone) return Math.round((parseInt(kStandalone[1].replace(',', '')) * 1000) / 2080);
    const monthMatch = salaryRange.match(/\$?([\d,]+)\s*\/\s*mo/i);
    if (monthMatch) return Math.round(parseInt(monthMatch[1].replace(',', '')) / 160);
    return null;
  };

  const highRateCount = jobs.filter((j) => {
    const hr = parseSalaryToHourly(j.salaryRange);
    return hr !== null && hr >= minRate;
  }).length;

  const excellentMatchCount = jobs.filter((j) => (j.matchScore ?? 0) >= 90).length;

  const metrics = [
    {
      title: 'VACANTES ACTIVAS',
      value: jobs.length.toString(),
      subtitle: 'Disponibles sin aplicar',
      icon: FileSearch,
      color: 'text-white',
      borderColor: 'border-zinc-700',
    },
    {
      title: `ALTO RATE (≥$${minRate}/hr)`,
      value: highRateCount.toString(),
      subtitle: 'Con salario parseado',
      icon: DollarSign,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: 'MATCH EXCELENTE (≥90%)',
      value: excellentMatchCount.toString(),
      subtitle: 'Según tu perfil',
      icon: Sparkles,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/20',
    },
    {
      title: 'SIN ANALIZAR',
      value: pendingAnalysisCount.toString(),
      subtitle: 'Pendientes de análisis IA',
      icon: AlertCircle,
      color: pendingAnalysisCount > 0 ? 'text-amber-400' : 'text-slate-400',
      borderColor: pendingAnalysisCount > 0 ? 'border-amber-500/20' : 'border-zinc-700',
    },
    {
      title: 'MIS POSTULACIONES',
      value: realApplicationsCount.toString(),
      subtitle: 'Aplicadas + En proceso',
      icon: CheckCircle2,
      color: 'text-blue-400',
      borderColor: 'border-blue-500/20',
    },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-6 bg-black min-h-screen text-slate-200">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {metrics.map((m, i) => (
          <div
            key={i}
            className={`bg-zinc-900 border ${m.borderColor} rounded-xl p-4 flex flex-col justify-between h-28 transition-colors`}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase w-24 leading-tight">
                {m.title}
              </h3>
              <m.icon className={`w-4 h-4 shrink-0 ${m.color}`} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
              <div className="text-xs text-slate-500">{m.subtitle}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Jobs Feed with embedded filter bar */}
      <DashboardJobs jobs={jobs} minHourlyRate={minRate} />
    </div>
  );
}
