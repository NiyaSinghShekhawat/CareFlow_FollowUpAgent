"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Stethoscope, Beaker, User, Scan } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Doctor", href: "/doctor", icon: Stethoscope },
    { name: "Lab", href: "/lab", icon: Beaker },
    { name: "Radiology", href: "/radiology", icon: Scan },
    { name: "Patient", href: "/patient", icon: User },
  ];

  return (
    <nav className="bg-slate-950 border-b border-slate-800 text-slate-400 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-white hover:text-teal-400 transition-colors">
             <div className="w-8 h-8 bg-gradient-to-tr from-teal-500 to-blue-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
               <span className="font-bold font-mono">C</span>
             </div>
             <span className="hidden md:inline">CareFlow</span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-slate-800 text-teal-400 shadow-sm" 
                      : "hover:bg-slate-900 hover:text-white"
                  )}
                >
                  <item.icon size={18} className={isActive ? "text-teal-400" : ""} />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
