import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const location = useLocation();

  const navItems = [
    { label: 'HOME', icon: LayoutDashboard, path: '/' },
    { label: 'TICKETS', icon: ClipboardList, path: '/tickets' },
    { label: 'REPORTS', icon: BarChart3, path: '/reports' },
  ];

  const activeIndex = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 0;
    if (path.startsWith('/tickets')) return 1;
    if (path.startsWith('/reports')) return 2;
    return 0;
  }, [location.pathname]);

  return (
    <nav className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[min(300px,calc(100vw-2rem))] -translate-x-1/2 md:hidden">
      <div className="relative h-16">

        {/* Background Layer with Deep Liquid Scoop */}
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)] border border-white/20 dark:border-slate-800/20 rounded-[32px] overflow-hidden">
          <div
            className="absolute top-[-1px] h-full w-[100px] transition-all duration-500 ease-bounce-out"
            style={{ left: `calc(${activeIndex * (100 / 3)}%)` }}
          >
            <svg viewBox="0 0 100 45" className="absolute top-0 w-full fill-white dark:fill-slate-900 transition-colors duration-300">
              <path d="M0 0 Q15 0 20 5 C30 15 35 34 50 34 S70 15 80 5 Q85 0 100 0 L100 45 L0 45 Z" />
            </svg>
          </div>
        </div>

        {/* Floating Circle with "Scale Pop" Icon */}
        <div
          className="absolute h-14 w-14 transition-all duration-500 ease-bounce-out z-20 pointer-events-none"
          style={{
            left: `calc(${activeIndex * (100 / 3)}% + ${(100 / 3 / 2)}% - 28px)`,
            top: '-24px',
          }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00918e] to-[#00b5b1] shadow-[0_8px_20px_-4px_rgba(0,145,142,0.5)] flex items-center justify-center border-[4px] border-white dark:border-slate-900 relative overflow-hidden">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Icon
                  key={`active-${index}`}
                  className={cn(
                    "text-white size-6 stroke-[2.5px] absolute transition-all duration-500",
                    index === activeIndex ? "scale-100 opacity-100 rotate-0" : "scale-0 opacity-0 rotate-12"
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Nav Links */}
        <div className="relative flex w-full h-full z-10 px-2">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex-1 flex flex-col items-center justify-end pb-2.5"
              >
                {/* Static Icon (Fades out and moves down when active) */}
                <div className={cn(
                  "transition-all duration-500 absolute top-5",
                  isActive ? "opacity-0 translate-y-4 scale-50" : "opacity-100 text-slate-400 dark:text-slate-500"
                )}>
                  <Icon className="size-6" />
                </div>

                {/* Active Label */}
                <span className={cn(
                  "text-[10px] font-black tracking-widest transition-all duration-500 uppercase",
                  isActive ? "text-[#00918e] dark:text-[#00c9c5] opacity-100 translate-y-0" : "text-slate-400 opacity-0 translate-y-4"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
