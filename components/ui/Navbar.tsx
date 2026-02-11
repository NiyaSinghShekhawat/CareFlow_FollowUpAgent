
import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export function Navbar({ title, icon: Icon, colorClass = "text-blue-400" }: { title: string, icon?: any, colorClass?: string }) {
  return (
    <nav className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
              <span className="font-medium text-sm hidden sm:block">Home</span>
            </Link>
            
            <div className="h-6 w-px bg-slate-800 mx-2"></div>
            
            <div className="flex items-center gap-2">
              {Icon && <Icon className={colorClass} size={20} />}
              <span className="font-bold text-xl tracking-tight text-white">
                {title}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-700">
                  ID
                </div>
             </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
