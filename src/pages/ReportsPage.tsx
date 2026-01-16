import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Download, BarChart3, PieChart as PieChartIcon, TrendingUp, ShieldCheck, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { MaintenanceTicket } from '@shared/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategoryDistributionChart, TicketStatusChart, MonthlyVolumeChart } from '@/components/report/ReportingWidgets';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export function ReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const { data: ticketsPage, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api<{ items: MaintenanceTicket[] }>('/api/tickets'),
  });

  const tickets = ticketsPage?.items ?? [];
  const completedTickets = tickets.filter(t => t.status === 'Completed' || t.status === 'Closed');
  const criticalTickets = tickets.filter(t => t.priority === 'Urgent' || t.priority === 'High');

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async () => {
    if (!reportRef.current) return;

    try {
      setIsExporting(true);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Higher quality
        useCORS: true, // For images
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`MTrack_Report_${format(new Date(), 'yyyy-MM')}.pdf`);
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Export failed", error);
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm md:text-base text-muted-foreground">Strategic facility maintenance insights.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 md:flex-none">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button size="sm" className="btn-gradient flex-1 md:flex-none" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Container for Capture */}
      <div ref={reportRef} id="report-content" className="bg-background print:bg-white p-1 md:p-4 rounded-xl print:p-0">

        {/* Formal Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 md:mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-lg bg-transparent flex items-center justify-center border border-slate-100 dark:border-slate-800">
              <img src="/apple-touch-icon.png" alt="Logo" className="h-10 w-10 md:h-14 md:w-14 object-contain" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">MTrack System</h1>
              <p className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest">Facility Management Division</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] md:text-xs font-bold uppercase text-muted-foreground">Report Period</p>
            <p className="text-sm md:text-base font-black">{format(new Date(), 'MMMM yyyy')}</p>
          </div>
        </div>

        {/* Dashboard Widgets */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mb-6">
          <Card className="print:shadow-none print:border-slate-200 shadow-sm overflow-hidden break-inside-avoid">
            <CardHeader className="pb-2 p-4 md:p-6 bg-muted/30">
              <CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                <PieChartIcon className="h-3.5 w-3.5 text-teal-500" />
                Category Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-4">
              <CategoryDistributionChart tickets={tickets} />
            </CardContent>
          </Card>
          <Card className="print:shadow-none print:border-slate-200 shadow-sm overflow-hidden break-inside-avoid">
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
          <Card className="print:shadow-none print:border-slate-200 shadow-sm overflow-hidden break-inside-avoid">
            <CardHeader className="pb-2 p-4 md:p-6 bg-muted/30">
              <CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                Service Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-4">
              <MonthlyVolumeChart tickets={tickets} />
            </CardContent>
          </Card>
        </div>

        {/* Lists Section */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <Card className="print:shadow-none print:border-slate-200 shadow-sm break-inside-avoid">
            <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Critical Incident Log</CardTitle>
                <CardDescription className="text-xs">Highest priority maintenance items.</CardDescription>
              </div>
              <FileText className="h-5 w-5 text-rose-500 opacity-50" />
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="space-y-3">
                {criticalTickets.slice(0, 8).map(ticket => (
                  <div key={ticket.id} className="flex items-center justify-between border-b border-muted/60 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-col min-w-0 flex-1 pr-4">
                      <span className="text-sm font-bold truncate">{ticket.title}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">{ticket.location}</span>
                    </div>
                    <div className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded uppercase ${ticket.priority === 'Urgent' ? 'bg-rose-50 text-rose-700 border border-rose-100/50' : 'bg-orange-50 text-orange-700 border border-orange-100/50'}`}>
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

          <Card className="print:shadow-none print:border-slate-200 shadow-sm break-inside-avoid">
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
                    <div className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded uppercase bg-emerald-50 text-emerald-700 border border-emerald-100/50">
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

        {/* Formal Footer */}
        <div className="hidden print:flex flex-col mt-16 pt-8 border-t-2 border-slate-200 break-inside-avoid">
          <div className="flex justify-between items-start gap-12">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-8">Prepared By</p>
              <div className="h-px bg-slate-900 w-full mb-2"></div>
              <p className="text-sm">Facility Manager</p>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-8">Approved By</p>
              <div className="h-px bg-slate-900 w-full mb-2"></div>
              <p className="text-sm">Director of Operations</p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-[10px] text-muted-foreground mb-1">Generated on {format(new Date(), 'PPpp')}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Confidential Information</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}