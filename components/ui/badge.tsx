
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'destructive' | 'success' | 'warning' | 'clinical';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: "bg-slate-900 text-slate-50 border-transparent hover:bg-slate-900/80",
    outline: "text-slate-950 border-slate-200 hover:bg-slate-100/50",
    destructive: "bg-red-500 text-slate-50 border-transparent hover:bg-red-500/80",
    success: "bg-emerald-500 text-slate-50 border-transparent hover:bg-emerald-500/80",
    warning: "bg-amber-500 text-slate-50 border-transparent hover:bg-amber-500/80",
    clinical: "bg-[var(--clinical-teal)] text-white border-transparent hover:opacity-90",
  };

  return (
    <div className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
      variants[variant],
      className
    )}>
      {children}
    </div>
  );
}
