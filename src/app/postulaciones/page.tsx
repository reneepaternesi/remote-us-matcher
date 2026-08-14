export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import KanbanBoard from './KanbanBoard';

export default async function PostulacionesPage() {
  const jobs = await prisma.job.findMany({
    where: {
      status: {
        notIn: ['AVAILABLE', 'DISCARDED']
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return (
    <div className="h-full flex flex-col max-w-[1400px] mx-auto bg-black text-slate-200">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Mis Postulaciones</h1>
          <p className="text-sm text-slate-400">Actualiza el estado de tus vacantes aplicadas para hacer seguimiento.</p>
        </div>
      </div>

      <KanbanBoard initialJobs={jobs} />
    </div>
  );
}
