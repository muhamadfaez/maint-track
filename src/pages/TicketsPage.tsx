import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarDays,
  Filter,
  ListFilter,
  MapPin,
  Search,
  Tag,
  UserRound,
  X,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import type { MaintenanceTicket } from '@shared/types';
import { MAINTENANCE_CATEGORIES, TICKET_STATUSES } from '@shared/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityIndicator } from '@/components/ticket/TicketComponents';
import { NewTicketDialog } from '@/components/ticket/NewTicketDialog';
import { Link } from 'react-router-dom';
import { format, parseISO, isWithinInterval, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 10;

const getDefaultDateRange = (): DateRange => ({
  from: startOfMonth(subMonths(new Date(), 2)),
  to: endOfMonth(new Date()),
});

const priorityRail = {
  Low: 'bg-slate-300 dark:bg-slate-700',
  Medium: 'bg-amber-400',
  High: 'bg-orange-500',
  Urgent: 'bg-rose-500',
};

export function TicketsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: ticketsPage, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api<{ items: MaintenanceTicket[] }>('/api/tickets'),
  });

  const tickets = ticketsPage?.items ?? [];
  const summary = useMemo(() => ({
    open: tickets.filter(ticket => ticket.status === 'In Progress / Pending').length,
    priority: tickets.filter(ticket => ticket.priority === 'Urgent' || ticket.priority === 'High').length,
    resolved: tickets.filter(ticket => ticket.status === 'Rectified' || ticket.status === 'Closed').length,
  }), [tickets]);

  const filteredTickets = tickets.filter(ticket => {
    const searchTerm = search.toLowerCase();
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm) ||
      ticket.location.toLowerCase().includes(searchTerm);
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

    let matchesDate = true;
    if (dateRange?.from) {
      const ticketDate = parseISO(ticket.createdAt);
      matchesDate = dateRange.to
        ? isWithinInterval(ticketDate, { start: dateRange.from, end: dateRange.to })
        : ticketDate >= dateRange.from;
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const defaultDateRange = getDefaultDateRange();
  const hasCustomDateRange = dateRange?.from?.getTime() !== defaultDateRange.from?.getTime() ||
    dateRange?.to?.getTime() !== defaultDateRange.to?.getTime();
  const hasCustomFilters = Boolean(search || categoryFilter !== 'all' || statusFilter !== 'all' || hasCustomDateRange);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter, dateRange]);

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setDateRange(getDefaultDateRange());
  };

  return (
    <AppLayout container contentClassName="mx-auto w-full max-w-6xl space-y-6 md:space-y-8">
      <header className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 px-5 py-6 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.5)] sm:px-7 md:px-9 md:py-8 dark:border-slate-800 dark:bg-slate-950/80">
        <div className="absolute -right-16 -top-24 h-60 w-60 rounded-full bg-teal-300/20 blur-3xl dark:bg-teal-500/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">
              <ListFilter className="h-3.5 w-3.5" />
              Maintenance workspace
            </div>
            <h1 className="text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl dark:text-white">Tickets, without the noise.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base dark:text-slate-400">
              Find, prioritise, and follow every facility issue from one focused queue.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50/80 px-2 py-3 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="min-w-[74px] px-3 text-center">
                <p className="text-lg font-black text-teal-700 dark:text-teal-300">{summary.open}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Open</p>
              </div>
              <div className="min-w-[74px] px-3 text-center">
                <p className="text-lg font-black text-rose-600 dark:text-rose-300">{summary.priority}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Priority</p>
              </div>
              <div className="min-w-[74px] px-3 text-center">
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-300">{summary.resolved}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Resolved</p>
              </div>
            </div>
            <div className="[&_button]:h-12 [&_button]:w-full [&_button]:rounded-xl [&_button]:px-5 [&_button]:font-bold sm:[&_button]:w-auto">
              <NewTicketDialog />
            </div>
          </div>
        </div>
      </header>

      <section aria-label="Ticket filters" className="rounded-[24px] border border-slate-200/80 bg-white/90 p-3 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.5)] sm:p-4 dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="Search tickets"
              placeholder="Search by issue or location…"
              className="h-12 rounded-xl border-slate-200 bg-slate-50/70 pl-11 pr-10 shadow-none focus-visible:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:focus-visible:bg-slate-900"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:flex">
            <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-full [&_button]:h-12 [&_button]:rounded-xl [&_button]:border-slate-200 [&_button]:bg-slate-50/70 [&_button]:shadow-none dark:[&_button]:border-slate-800 dark:[&_button]:bg-slate-900/70" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger aria-label="Filter by category" className="h-12 w-full rounded-xl border-slate-200 bg-slate-50/70 shadow-none xl:w-[185px] dark:border-slate-800 dark:bg-slate-900/70">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {MAINTENANCE_CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filter by status" className="h-12 w-full rounded-xl border-slate-200 bg-slate-50/70 shadow-none xl:w-[175px] dark:border-slate-800 dark:bg-slate-900/70">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {TICKET_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 px-1 pt-3 text-xs dark:border-slate-800">
          <p className="font-medium text-slate-500 dark:text-slate-400">
            <span className="font-black text-slate-900 dark:text-white">{filteredTickets.length}</span> {filteredTickets.length === 1 ? 'ticket' : 'tickets'} in view
          </p>
          {hasCustomFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="h-7 rounded-lg px-2 text-xs text-slate-500">
              <X className="h-3.5 w-3.5" /> Clear filters
            </Button>
          )}
        </div>
      </section>

      <section aria-label="Ticket list" className="space-y-3">
        {isLoading ? (
          <div className="grid min-h-56 place-items-center rounded-[24px] border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
              Loading ticket queue…
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="grid min-h-64 place-items-center rounded-[24px] border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <Filter className="h-5 w-5" />
              </div>
              <p className="mt-4 font-bold text-slate-900 dark:text-white">No matching tickets</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try widening your date range or clearing a filter.</p>
              <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="mt-4 rounded-lg">Reset filters</Button>
            </div>
          </div>
        ) : (
          <>
            {paginatedTickets.map((ticket, index) => (
              <Link key={ticket.id} to={`/tickets/${ticket.id}`} className="group block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <article className="relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_14px_44px_-36px_rgba(15,23,42,0.55)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-teal-200 group-hover:shadow-[0_22px_50px_-34px_rgba(13,148,136,0.38)] sm:p-5 dark:border-slate-800 dark:bg-slate-950/80 dark:group-hover:border-teal-900">
                  <div className={`absolute inset-y-0 left-0 w-1 ${priorityRail[ticket.priority]}`} />
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-5">
                    <div className="hidden h-12 w-12 place-items-center rounded-2xl bg-slate-100 font-mono text-xs font-black text-slate-400 sm:grid dark:bg-slate-900 dark:text-slate-500">
                      {String(startIndex + index + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold tracking-tight text-slate-950 sm:text-lg dark:text-white">{ticket.title}</h2>
                        <PriorityIndicator priority={ticket.priority} />
                      </div>
                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                        <span className="flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{ticket.location}</span></span>
                        <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />{ticket.category}</span>
                        <span className="hidden items-center gap-1.5 md:flex"><UserRound className="h-3.5 w-3.5" />{ticket.reporter}</span>
                        <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{format(parseISO(ticket.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="mt-3 sm:hidden"><StatusBadge status={ticket.status} /></div>
                    </div>
                    <div className="flex items-center gap-3 pl-1">
                      <div className="hidden text-right sm:block">
                        <StatusBadge status={ticket.status} />
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Updated {format(parseISO(ticket.updatedAt), 'MMM d')}</p>
                      </div>
                      <div className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-400 transition-all group-hover:border-teal-200 group-hover:bg-teal-50 group-hover:text-teal-700 dark:border-slate-800 dark:group-hover:border-teal-900 dark:group-hover:bg-teal-950 dark:group-hover:text-teal-300">
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}

            {totalPages > 1 && (
              <div className="pt-4">
                <Pagination>
                  <PaginationContent className="rounded-xl border border-slate-200 bg-white/90 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        aria-disabled={currentPage === 1}
                        onClick={event => {
                          event.preventDefault();
                          if (currentPage > 1) setCurrentPage(page => page - 1);
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-40' : ''}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={currentPage === page}
                          onClick={event => {
                            event.preventDefault();
                            setCurrentPage(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        aria-disabled={currentPage === totalPages}
                        onClick={event => {
                          event.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(page => page + 1);
                        }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-40' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </section>
    </AppLayout>
  );
}
