import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Gauge,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import type { MaintenanceTicket } from '@shared/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityIndicator } from '@/components/ticket/TicketComponents';
import { differenceInHours, format, parseISO } from 'date-fns';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 6;

type StatCardProps = {
  label: string;
  value: number;
  helper: string;
  icon: React.ElementType;
  tone: 'teal' | 'emerald' | 'rose';
};

const statTones = {
  teal: {
    accent: 'bg-teal-500',
    icon: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    value: 'text-teal-700 dark:text-teal-300',
  },
  emerald: {
    accent: 'bg-emerald-500',
    icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    value: 'text-emerald-700 dark:text-emerald-300',
  },
  rose: {
    accent: 'bg-rose-500',
    icon: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    value: 'text-rose-700 dark:text-rose-300',
  },
};

function StatCard({ label, value, helper, icon: Icon, tone }: StatCardProps) {
  const colors = statTones[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-28px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-950/75">
      <div className={cn('absolute inset-y-0 left-0 w-1', colors.accent)} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className={cn('mt-3 text-4xl font-black tracking-[-0.05em]', colors.value)}>{value}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{helper}</p>
        </div>
        <div className={cn('grid h-10 w-10 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105', colors.icon)}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data: ticketsPage, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api<{ items: MaintenanceTicket[] }>('/api/tickets'),
  });

  const stats = useMemo(() => {
    const tickets = ticketsPage?.items ?? [];
    const active = tickets.filter(t => t.status !== 'Rectified' && t.status !== 'Closed').length;
    const completed = tickets.filter(t => t.status === 'Rectified').length;
    const stagnant = tickets.filter(t => {
      if (t.status === 'Rectified' || t.status === 'Closed') return false;
      return differenceInHours(new Date(), parseISO(t.updatedAt)) >= 48;
    });
    return { active, completed, stagnantCount: stagnant.length, stagnant };
  }, [ticketsPage]);

  const totalPages = Math.max(1, Math.ceil(stats.stagnant.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedStagnant = stats.stagnant.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [stats.stagnantCount]);

  if (isLoading) {
    return (
      <AppLayout container>
        <div className="grid min-h-[55vh] place-items-center">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
            Preparing operations overview…
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout container contentClassName="mx-auto w-full max-w-6xl space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-950 px-5 py-6 text-white shadow-[0_28px_70px_-38px_rgba(2,132,130,0.75)] sm:px-7 md:px-9 md:py-8 dark:border dark:border-slate-800">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-300 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-300" />
              </span>
              Operations overview
            </div>
            <h1 className="text-3xl font-black tracking-[-0.045em] sm:text-4xl md:text-5xl">Keep every space running.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              A focused view of maintenance activity, resolved work, and issues that need a timely follow-up.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:items-end">
            <p className="text-xs font-medium text-slate-400">{format(new Date(), 'EEEE, MMMM d')}</p>
            <Button asChild className="h-11 rounded-xl bg-teal-400 px-5 font-bold text-slate-950 shadow-none hover:bg-teal-300">
              <Link to="/tickets">
                <ClipboardList className="h-4 w-4" />
                View all tickets
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-label="Ticket summary" className="grid gap-3 sm:grid-cols-3 md:gap-4">
        <StatCard label="Active tickets" value={stats.active} helper="Currently in motion" icon={Activity} tone="teal" />
        <StatCard label="Rectified" value={stats.completed} helper="Work completed" icon={CheckCircle2} tone="emerald" />
        <StatCard label="Needs follow-up" value={stats.stagnantCount} helper="No update in 48h+" icon={Clock3} tone="rose" />
      </section>

      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-950/75">
        <div className="flex flex-col gap-4 border-b border-slate-200/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertTriangle className="h-[18px] w-[18px]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">Attention queue</h2>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                  {stats.stagnantCount} waiting
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Oldest untouched work is surfaced first for faster follow-up.</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs font-semibold text-slate-400 sm:flex">
            <Gauge className="h-4 w-4" />
            48-hour threshold
          </div>
        </div>

        <div className="p-3 sm:p-4">
          {stats.stagnant.length === 0 ? (
            <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/10">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="mt-4 font-bold text-slate-900 dark:text-white">The queue is clear</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Every active ticket has had a recent update.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedStagnant.map((ticket, index) => {
                const idleHours = Math.max(48, differenceInHours(new Date(), parseISO(ticket.updatedAt)));
                return (
                  <Link
                    key={ticket.id}
                    to={`/tickets/${ticket.id}`}
                    className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50 sm:gap-4 sm:px-4 dark:hover:border-slate-800 dark:hover:bg-slate-900/60"
                  >
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-500 transition-colors group-hover:bg-teal-50 group-hover:text-teal-700 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:bg-teal-950 dark:group-hover:text-teal-300">
                      {String(startIndex + index + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate font-bold text-slate-900 dark:text-white">{ticket.title}</span>
                        <PriorityIndicator priority={ticket.priority} />
                      </div>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="truncate">{ticket.location}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span>{ticket.category}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span>{format(parseISO(ticket.createdAt), 'MMM d')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pl-1">
                      <div className="hidden text-right lg:block">
                        <StatusBadge status={ticket.status} />
                        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-500">{idleHours}h idle</p>
                      </div>
                      <div className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-400 transition-all group-hover:border-teal-200 group-hover:bg-teal-50 group-hover:text-teal-700 dark:border-slate-800 dark:group-hover:border-teal-900 dark:group-hover:bg-teal-950 dark:group-hover:text-teal-300">
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {stats.stagnant.length > ITEMS_PER_PAGE && (
            <Pagination className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? 'pointer-events-none opacity-40' : ''}
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage(prev => Math.max(1, prev - 1));
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, index) => (
                  <PaginationItem key={`page-${index + 1}`}>
                    <PaginationLink
                      href="#"
                      isActive={currentPage === index + 1}
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage(index + 1);
                      }}
                    >
                      {index + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={currentPage === totalPages}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-40' : ''}
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
