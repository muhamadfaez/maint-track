import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Download, BarChart3, PieChart as PieChartIcon, TrendingUp, ShieldCheck, FileText } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { MaintenanceTicket } from '@shared/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategoryDistributionChart, TicketStatusChart, MonthlyVolumeChart } from '@/components/report/ReportingWidgets';
import { format, parseISO } from 'date-fns';
export function ReportsPage() {
  const { data: ticketsPage, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api<{ items: MaintenanceTicket[] }>('/api/tickets'),
  });
  const tickets = ticketsPage?.items ?? [];
  const completedTickets = tickets.filter(t => t.status === 'Completed' || t.status === 'Closed');
  const criticalTickets = tickets.filter(t => t.priority === 'Emergency' || t.priority === 'High');
  const handlePrint = () => {
    window.print();
  };
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
    <AppLayout container contentClassName="space-y-6 md:space-y-8 print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Executive Reporting</h1>
          <p className="text-sm md:text-base text-muted-foreground">Strategic facility maintenance insights.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 md:flex-none">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button size="sm" className="btn-gradient flex-1 md:flex-none">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>
      {/* Print Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-10 w-10 text-[#F38020]" />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">UniMaintain University</h1>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Facility Management Division</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-muted-foreground">Report Period</p>
            <p className="text-sm font-black">{format(new Date(), 'MMMM yyyy')}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="print:shadow-none print:border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 p-4 md:p-6 bg-muted/30">
            <CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
              <PieChartIcon className="h-3.5 w-3.5 text-blue-500" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-4">
            <CategoryDistributionChart tickets={tickets} />
          </CardContent>
        </Card>
        <Card className="print:shadow-none print:border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 p-4 md:p-6 bg-muted/30">
            <CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5 text-amber-500" />
              Workflow Stages
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-4">
            <TicketStatusChart tickets={tickets} />
          </CardContent>
        </Card>
        <Card className="print:shadow-none print:border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 p-4 md:p-6 bg-muted/30">
            <CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              Service Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-4">
            <MonthlyVolumeChart tickets={tickets} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="print:shadow-none print:border-slate-200 shadow-sm">
          <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Critical Incident Log</CardTitle>
              <CardDescription className="text-xs">Highest priority maintenance items.</CardDescription>
            </div>
            <FileText className="h-5 w-5 text-red-500 opacity-50" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-3">
              {criticalTickets.slice(0, 8).map(ticket => (
                <div key={ticket.id} className="flex items-center justify-between border-b border-muted/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-col min-w-0 flex-1 pr-4">
                    <span className="text-sm font-bold truncate">{ticket.title}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">{ticket.location}</span>
                  </div>
                  <div className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded uppercase ${ticket.priority === 'Emergency' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {ticket.priority}
                  </div>
                </div>
              ))}
              {criticalTickets.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-12 italic">No active critical incidents.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="print:shadow-none print:border-slate-200 shadow-sm">
          <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Resolution Performance</CardTitle>
              <CardDescription className="text-xs">Recently completed service requests.</CardDescription>
            </div>
            <ShieldCheck className="h-5 w-5 text-green-500 opacity-50" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-3">
              {completedTickets.slice(0, 8).map(ticket => (
                <div key={ticket.id} className="flex items-center justify-between border-b border-muted/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-col min-w-0 flex-1 pr-4">
                    <span className="text-sm font-bold truncate">{ticket.title}</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">
                      Resolved {format(parseISO(ticket.updatedAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded uppercase bg-green-100 text-green-700">
                    {ticket.status}
                  </div>
                </div>
              ))}
              {completedTickets.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-12 italic">No resolutions logged in this period.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="hidden print:block pt-12 text-center">
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
          End of Official Maintenance Report • Confidential Information
        </p>
      </div>
    </AppLayout>
  );
}