import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
export function MobileNav() {
  const location = useLocation();
  const navItems = [
    {
      label: 'Home',
      icon: LayoutDashboard,
      path: '/',
    },
    {
      label: 'Tickets',
      icon: ClipboardList,
      path: '/tickets',
    },
    {
      label: 'Reports',
      icon: BarChart3,
      path: '/reports',
    },
  ];
  const activeIndex = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 0;
    if (path.startsWith('/tickets')) return 1;
    if (path.startsWith('/reports')) return 2;
    return 0;
  }, [location.pathname]);
  const ITEM_WIDTH = 70; // Width in pixels for each nav item
  const CONTAINER_PADDING = 8; // Based on px-2 (8px)
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
      <div className="relative flex bg-white dark:bg-slate-900 shadow-xl rounded-[20px] px-2 h-16 items-center border border-slate-200/50 dark:border-slate-800/50">
        {/* Magic Indicator Background */}
        <div
          className="absolute left-0 h-14 w-14 rounded-full bg-gradient-to-br from-[#F38020] to-[#E55A1B] transition-all duration-600 ease-out shadow-primary shadow-lg magic-indicator z-0"
          style={{
            transform: `translateX(calc(${activeIndex * ITEM_WIDTH}px + ${CONTAINER_PADDING}px + ((${ITEM_WIDTH}px - 56px) / 2)))`,
            top: '-28px', // Centered vertically relative to the top edge (56px / 2)
          }}
        />
        {/* Navigation Items */}
        <div className="flex relative z-10">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center transition-all duration-500"
                style={{ width: `${ITEM_WIDTH}px` }}
              >
                <div
                  className={cn(
                    "flex items-center justify-center transition-all duration-500",
                    isActive
                      ? "-translate-y-7 text-white scale-110"
                      : "text-slate-400 hover:text-slate-600 dark:text-slate-500"
                  )}
                >
                  <Icon className={cn("size-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                </div>
                <span
                  className={cn(
                    "absolute transition-all duration-500 text-[10px] font-bold uppercase tracking-wider",
                    isActive
                      ? "translate-y-3 opacity-100 text-[#E55A1B]"
                      : "translate-y-10 opacity-0 text-transparent"
                  )}
                >
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