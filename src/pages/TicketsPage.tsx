import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { MaintenanceTicket } from '@shared/types';
import { MAINTENANCE_CATEGORIES, TICKET_STATUSES } from '@shared/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, PriorityIndicator } from '@/components/ticket/TicketComponents';
import { NewTicketDialog } from '@/components/ticket/NewTicketDialog';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
export function TicketsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: ticketsPage, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api<{ items: MaintenanceTicket[] }>('/api/tickets'),
  });
  const tickets = ticketsPage?.items ?? [];
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return (
    <AppLayout container contentClassName="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Maintenance Tickets</h1>
          <p className="text-sm text-muted-foreground">Manage and track all facility issues.</p>
        </div>
        <div className="w-full sm:w-auto">
          <NewTicketDialog />
        </div>
      </div>
      <Card className="shadow-sm border-muted">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              className="pl-9 h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 md:flex gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {MAINTENANCE_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {TICKET_STATUSES.map(stat => (
                  <SelectItem key={stat} value={stat}>{stat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:gap-4">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center border rounded-xl border-dashed bg-muted/20 text-muted-foreground">
            <Filter className="h-8 w-8 mb-2 opacity-20" />
            <p>No tickets found matching your filters.</p>
          </div>
        ) : (
          filteredTickets.map(ticket => (
            <Link key={ticket.id} to={`/tickets/${ticket.id}`}>
              <Card className="hover:border-primary/50 hover:bg-accent/5 transition-all cursor-pointer group rounded-xl overflow-hidden">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base md:text-lg truncate">{ticket.title}</span>
                      <PriorityIndicator priority={ticket.priority} />
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground flex-wrap">
                      <span className="truncate">{ticket.location}</span>
                      <span>•</span>
                      <span className="font-medium text-foreground/70">{ticket.category}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline italic">By {ticket.reporter}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={ticket.status} className="whitespace-nowrap" />
                    <div className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-tighter hidden xs:block">
                      Updated {format(parseISO(ticket.updatedAt), 'MMM d')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </AppLayout>
  );
}