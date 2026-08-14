import { FileSearch, DollarSign, Sparkles, ShieldCheck, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import prisma from '@/lib/prisma';

import RefreshFeedsButton from '@/components/RefreshFeedsButton';
import DashboardJobs from '@/components/DashboardJobs';

export default async function Home() {
  // Fetch available jobs from the database
  const jobs = await prisma.job.findMany({
    where: { status: 'AVAILABLE' },
    orderBy: { matchScore: 'desc' },
  });

  const appliedCount = await prisma.job.count({
    where: { status: { notIn: ['AVAILABLE'] } }
  });

  const metrics = [
    { title: 'VACANTES ACTIVAS', value: jobs.length.toString(), subtitle: 'Extraidas y filtradas', icon: FileSearch, color: 'text-slate-400' },
    { title: 'ALTO RATE (≥$50/HR USD)', value: jobs.filter(j => j.salaryRange?.includes('50') || j.salaryRange?.includes('60') || j.salaryRange?.includes('70') || j.salaryRange?.includes('80') || j.salaryRange?.includes('100')).length.toString(), subtitle: 'Basado en extracción', icon: DollarSign, color: 'text-emerald-400' },
    { title: 'MATCH EXCELENTE (≥90%)', value: jobs.filter(j => (j.matchScore ?? 0) >= 90).length.toString(), subtitle: 'Según tu perfil', icon: Sparkles, color: 'text-cyan-400' },
    { title: 'CONTRATOS LARGA DURACIÓN', value: '0', subtitle: '6 a 12+ meses', icon: ShieldCheck, color: 'text-slate-400' },
    { title: 'MIS POSTULACIONES', value: appliedCount.toString(), subtitle: 'En Kanban', icon: CheckCircle2, color: 'text-slate-400' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-6 bg-black min-h-screen text-slate-200">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between h-28">
            <div className="flex justify-between items-start">
              <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase w-24">{m.title}</h3>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${m.color === 'text-cyan-400' ? 'text-cyan-400' : 'text-white'}`}>
                {m.value}
              </div>
              <div className="text-xs text-slate-500">{m.subtitle}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Area */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Buscar rol (React, Next.js, Design Systems), empresa o skill..." 
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
          />
          <select className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300 w-64 focus:outline-none focus:border-cyan-500">
            <option>Todas las fuentes de búsqueda</option>
          </select>
          <div className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 flex items-center gap-4 w-72">
            <DollarSign className="w-4 h-4 text-cyan-400" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Tarifa Mínima USD</span>
                <span className="text-white font-medium">$45 USD/hr</span>
              </div>
              <div className="h-1 bg-slate-700 rounded-full w-full">
                <div className="h-full bg-cyan-400 rounded-full w-[45%]"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 items-center flex-wrap">
          {['Direct Hire EE. UU.', 'Larga Duración (≥6m)', '$ Alta Remuneración (≥$50/hr)', '✨ Match ≥ 90%', 'Disponibles Sin Aplicar'].map(tag => (
            <button key={tag} className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-slate-700">
              {tag}
            </button>
          ))}
          <button className="flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-cyan-500/20">
            <SlidersHorizontal className="w-3 h-3" />
            Filtros de Mi Perfil ($45/hr)
          </button>
          <button className="text-slate-500 hover:text-slate-300 text-xs font-medium px-2">
            ↺ Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex justify-between items-end border-b border-zinc-800 pb-2">
        <div className="flex gap-4 items-center">
          <h2 className="text-sm text-slate-300">Mostrando <strong className="text-white">{jobs.length}</strong> de {jobs.length} vacantes disponibles sin aplicar <span className="text-slate-500">({appliedCount} en Postulaciones)</span></h2>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-medium">Feeds en Vivo Activos</span>
          <span className="text-xs text-slate-500 underline cursor-pointer"></span>
        </div>
        <RefreshFeedsButton />
      </div>

      {/* Jobs Feed */}
      <DashboardJobs jobs={jobs} />

    </div>
  );
}
