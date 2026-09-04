export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-black/80 backdrop-blur-sm">
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          © {year}{' '}
          <span className="text-slate-400 font-medium">Renée Paternesi</span>
          {' '}— Remote:US Matcher. All rights reserved.
        </p>
        <p className="text-[10px] text-slate-600 hidden sm:block">
          Built for Senior Frontend IC job hunting · Powered by AI
        </p>
      </div>
    </footer>
  );
}
