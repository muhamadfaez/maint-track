import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardList,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import type { MaintenanceTicket } from '@shared/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityIndicator } from '@/components/ticket/TicketComponents';
import { differenceInHours, format, parseISO } from 'date-fns';
export function HomePage() {
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
      const hours = differenceInHours(new Date(), parseISO(t.updatedAt));
      return hours >= 48;
    });
    return { active, completed, stagnantCount: stagnant.length, stagnant };
  }, [ticketsPage]);
  if (isLoading) {
    return (
      <AppLayout container>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout container contentClassName="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Supervisor Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Facility maintenance at a glance.</p>
        </div>
        <Button asChild className="btn-gradient w-full md:w-auto">
          <Link to="/tickets">
            <ClipboardList className="mr-2 h-4 w-4" /> View All Tickets
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="glass border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
            <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(179,100%,28%)] dark:text-teal-400">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>
        <Card className="glass border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>
        <Card className={cn("glass border-none", stats.stagnantCount > 0 ? "ring-1 ring-rose-500/50 bg-rose-50/10" : "")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stagnant</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.stagnantCount > 0 ? "text-rose-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.stagnantCount > 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>
              {stats.stagnantCount}
            </div>
            <p className="text-xs text-muted-foreground">Untouched for 48h+</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Attention Needed
          </CardTitle>
          <CardDescription>
            Tickets that have not been updated in over 48 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 md:px-6">
          <div className="space-y-3">
            {stats.stagnant.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No stagnant tickets. Keep it up!
              </div>
            ) : (
              stats.stagnant.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent transition-colors group"
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{ticket.title}</span>
                      <PriorityIndicator priority={ticket.priority} />
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{ticket.location}</span>
                      <span>•</span>
                      <span>{ticket.category}</span>
                      <span>•</span>
                      <span className="text-foreground/60 font-medium">{format(parseISO(ticket.createdAt), 'MMM d')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <StatusBadge status={ticket.status} className="hidden xs:flex" />
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}