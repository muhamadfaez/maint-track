import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Download, BarChart3, PieChart as PieChartIcon, TrendingUp, ShieldCheck, FileText, Loader2, Table, Sparkles } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { MaintenanceTicket } from '@shared/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategoryDistributionChart, TicketStatusChart, MonthlyVolumeChart, KPIGrid } from '@/components/report/ReportingWidgets';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { format, parseISO, isWithinInterval, startOfMonth, subMonths, endOfMonth, isValid } from 'date-fns';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DateRange } from 'react-day-picker';
import { ReportTable } from '@/components/report/ReportTable';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';

interface RefinedTicketData {
  id: string;
  refinedTitle: string;
  refinedDescription: string;
  refinedLocation: string;
  refinedCategory: string;
}

export function ReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isRefining, setIsRefining] = React.useState(false);
  const [refinedData, setRefinedData] = React.useState<Map<string, RefinedTicketData>>(new Map());

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date()),
  });

  const { data: ticketsPage, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api<{ items: MaintenanceTicket[] }>('/api/tickets'),
  });

  const allTickets = ticketsPage?.items ?? [];

  const formatDate = (value: string, pattern: string) => {
    const date = parseISO(value);
    return isValid(date) ? format(date, pattern) : '—';
  };

  const csvEscape = (value: unknown) => {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  };

  // Filter tickets by date range
  const rawTickets = React.useMemo(() => {
    if (!dateRange?.from) return allTickets;

    return allTickets.filter(t => {
      const ticketDate = parseISO(t.createdAt);
      if (!isValid(ticketDate)) return false;
      if (!dateRange.to) {
        return ticketDate >= dateRange.from!;
      }
      return isWithinInterval(ticketDate, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [allTickets, dateRange]);

  // Merge refined data
  const tickets = React.useMemo(() => {
    if (refinedData.size === 0) return rawTickets;

    return rawTickets.map(t => {
      const refined = refinedData.get(t.id);
      return refined ? {
        ...t,
        title: refined.refinedTitle,
        description: refined.refinedDescription,
        location: refined.refinedLocation,
        category: refined.refinedCategory as any,
        originalTitle: t.title
      } : t;
    });
  }, [rawTickets, refinedData]);

  const handleRefineAI = async () => {
    if (rawTickets.length === 0) {
      toast.error("No tickets to refine");
      return;
    }

    setIsRefining(true);
    toast.info("Refining ticket descriptions with AI... This may take a moment.");

    try {
      // Prepare payload
      const payload = rawTickets.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        location: t.location,
        category: t.category
      }));

      const response = await api<{ refined: RefinedTicketData[] }>('/api/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets: payload })
      });

      // Update state
      const newMap = new Map(refinedData);
      response.refined.forEach(r => {
        newMap.set(r.id, r);
      });
      setRefinedData(newMap);

      toast.success(`Successfully refined ${response.refined.length} tickets!`);
    } catch (error: any) {
      console.error("AI Refinement failed", error);
      toast.error(`AI Refinement failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsRefining(false);
    }
  };

  const completedTickets = tickets.filter(t => t.status === 'Rectified' || t.status === 'Closed');
  const criticalTickets = tickets.filter(t => t.priority === 'Urgent' || t.priority === 'High');

  const periodString = `${dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : 'Start'} - ${dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : 'Present'}`;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!tableRef.current) return;

    try {
      setIsExporting(true);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pages = tableRef.current.querySelectorAll<HTMLElement>('.report-page');
      const margin = 10;
      const imgWidth = 210 - margin * 2;

      for (let i = 0; i < pages.length; i += 1) {
        const page = pages[i];
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1200
        });
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      }

      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i += 1) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.text(`Page ${i} of ${totalPages}`, 210 - margin, 297 - margin / 2, { align: 'right' });
      }

      pdf.save(`MTrack_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success("PDF Report downloaded successfully");
    } catch (error) {
      console.error("Export failed", error);
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (tickets.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const headers = ["ID", "Title", "Category", "Status", "Priority", "Location", "Reporter", "Created At", "Updated At"];
      const rows = tickets.map(t => [
        csvEscape(t.id),
        csvEscape(t.title),
        csvEscape(t.category),
        csvEscape(t.status),
        csvEscape(t.priority),
        csvEscape(t.location),
        csvEscape(t.reporter),
        csvEscape(formatDate(t.createdAt, 'yyyy-MM-dd HH:mm:ss')),
        csvEscape(formatDate(t.updatedAt, 'yyyy-MM-dd HH:mm:ss'))
      ]);

      const csvContent = [
        headers.map(csvEscape).join(","),
        ...rows.map(r => r.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `MTrack_Data_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV Data downloaded successfully");
    } catch (error) {
      console.error("CSV Export failed", error);
      toast.error("Failed to export CSV");
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-full sm:w-auto" />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 sm:flex-none">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <Eye className="mr-2 h-4 w-4" /> Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[230mm] max-h-[90vh] overflow-y-auto bg-slate-100">
                <DialogHeader>
                  <DialogTitle>Report Preview</DialogTitle>
                  <DialogDescription>
                    This is how your PDF report will look. {refinedData.size > 0 && <span className="text-purple-600 font-bold">✨ AI Refined Content Active</span>}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center p-4">
                  <div className="scale-75 origin-top shadow-lg">
                    <ReportTable tickets={tickets} period={periodString} systemName="MTrack System" logoSrc="/apple-touch-icon.png" />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={handleRefineAI} disabled={isRefining} className="flex-1 sm:flex-none btn-gradient-secondary">
              {isRefining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-purple-500" />}
              Refine AI
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex-1 sm:flex-none">
              <Table className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button size="sm" className="btn-gradient flex-1 sm:flex-none" onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden container for PDF generation - keep it renderable for html2canvas */}
      <div className="fixed top-0 left-0 opacity-0 pointer-events-none -z-10 w-[210mm] min-h-[297mm]" aria-hidden="true">
        <div ref={tableRef} className="w-[210mm] min-h-[297mm] bg-white text-black p-8 shadow-none">
          {/* Wrapper to enforce consistent width for capture */}
          <ReportTable tickets={tickets} period={periodString} systemName="MTrack System" logoSrc="/apple-touch-icon.png" />
        </div>
      </div>

      {/* On-screen Dashboard Container */}
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
            <p className="text-sm md:text-base font-black">
              {periodString}
            </p>
          </div>
        </div>

        {/* KPI Grid */}
        <KPIGrid tickets={tickets} />

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
                        Resolved {formatDate(ticket.updatedAt, 'MMM d, yyyy')}
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
