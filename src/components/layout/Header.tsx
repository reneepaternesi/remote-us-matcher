'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, Link as LinkIcon, CheckSquare, User } from 'lucide-react';

export default function Header({ availableCount = 0, appliedCount = 0 }: { availableCount?: number, appliedCount?: number }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Vacantes', path: '/', icon: Briefcase, count: availableCount },
    { name: 'Web Scraper', path: '/scraper', icon: LinkIcon },
    { name: 'Postulaciones', path: '/postulaciones', icon: CheckSquare, count: appliedCount },
    { name: 'Perfil & Precisión', path: '/perfil', icon: User },
  ];

  return (
    <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="bg-cyan-500 text-slate-900 font-bold w-10 h-10 flex items-center justify-center rounded text-xl">
          R
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            REMOTE:US <span className="text-xs bg-slate-700 text-cyan-400 px-2 py-0.5 rounded uppercase tracking-wider">Contractor Portal</span>
          </h1>
          <p className="text-xs text-slate-400">High-Rate Monitoring & Direct US Matcher • Renée Paternesi</p>
        </div>
      </div>

      <nav className="flex items-center gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
              {item.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-cyan-500/20' : 'bg-slate-700'}`}>
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
