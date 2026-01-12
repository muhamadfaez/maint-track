import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  User,
  Calendar,
  ExternalLink,
  Wrench,
  CheckCircle,
  AlertCircle,
  Printer,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { api } from '@/lib/api-client';
import type { MaintenanceTicket, TicketStatus } from '@shared/types';
import { TICKET_STATUSES } from '@shared/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, PriorityIndicator } from '@/components/ticket/TicketComponents';
import { TimelineSection } from '@/components/ticket/TimelineSection';
import { AssignContractorDialog } from '@/components/ticket/AssignContractorDialog';
import { EditTicketDialog } from '@/components/ticket/EditTicketDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api<MaintenanceTicket>(`/api/tickets/${id}`),
    enabled: !!id
  });
  const updateStatusMutation = useMutation({
    mutationFn: (status: TicketStatus) =>
      api(`/api/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['timeline', id] });
      toast.success('Status updated');
    }
  });

  const deletePhotoMutation = useMutation({
    mutationFn: () =>
      api(`/api/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ initialPhotoUrl: null })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Photo removed');
    }
  });

  const deleteTicketMutation = useMutation({
    mutationFn: () => api(`/api/tickets/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket deleted successfully');
      navigate('/tickets');
    }
  });

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
  if (error || !ticket) {
    return (
      <AppLayout container>
        <div className="text-center py-20 px-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Ticket Not Found</h2>
          <p className="text-muted-foreground mt-2">The ticket you are looking for does not exist or has been removed.</p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/tickets">Back to List</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout container contentClassName="space-y-6">
      <div className="flex flex-col gap-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
            <Link to="/tickets" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> <span>Back to Tickets</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            <Button variant="outline" size="sm" onClick={handlePrint} className="hidden md:flex h-9 shadow-sm">
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={ticket.status}
                onValueChange={(val) => updateStatusMutation.mutate(val as TicketStatus)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="flex-1 sm:w-[160px] h-9 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <EditTicketDialog ticket={ticket} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="h-9 px-3 shadow-sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass border-none">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the ticket
                      and all associated timeline events.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="glass">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteTicketMutation.mutate()}
                      className="bg-rose-600 hover:bg-rose-700 shadow-lg text-white"
                    >
                      Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={ticket.status} className="text-xs px-2.5 py-0.5" />
              <PriorityIndicator priority={ticket.priority} />
            </div>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              {ticket.title}
            </h1>
            <div className="flex items-center gap-3 text-muted-foreground text-xs md:text-sm">
              <Calendar className="h-3.5 w-3.5" />
              <span>Reported {format(parseISO(ticket.createdAt), 'PPP')}</span>
            </div>
          </div>
          <Card className="print:shadow-none print:border-slate-200 border-muted shadow-sm">
            <CardContent className="p-4 md:p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Incident Description</h3>
                <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap text-foreground/90">{ticket.description}</p>
              </div>
              {ticket.initialPhotoUrl && (
                <div className="space-y-3 pt-2 print:hidden">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Site Documentation</h3>
                  <div className="aspect-video relative rounded-xl overflow-hidden border shadow-inner bg-muted/30 group">
                    <img src={ticket.initialPhotoUrl} alt="Initial site condition" className="object-cover w-full h-full" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={deletePhotoMutation.isPending}
                      onClick={() => deletePhotoMutation.mutate()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="print:mt-8">
            <TimelineSection ticketId={ticket.id} />
          </div>
        </div>
        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="print:shadow-none print:border-slate-200 border-muted shadow-sm">
            <CardHeader className="p-4 md:p-6 pb-2">
              <CardTitle className="text-base md:text-lg">Facility Metadata</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-teal-50 text-[hsl(179,100%,28%)] dark:bg-teal-900/20 dark:text-teal-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Location</p>
                  <p className="text-sm font-medium">{ticket.location}</p>
                </div>
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Asset Category</p>
                  <p className="text-sm font-medium">{ticket.category}</p>
                </div>
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Reported By</p>
                  <p className="text-sm font-medium">{ticket.reporter}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="print:shadow-none print:border-slate-200 border-muted shadow-sm overflow-hidden">
            <CardHeader className="p-4 md:p-6 pb-2">
              <CardTitle className="text-base md:text-lg">Service Partnership</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 space-y-4">
              {ticket.contractorName ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg border border-emerald-100/50">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-bold uppercase">Contractor Verified</span>
                  </div>
                  <div className="px-1">
                    <p className="text-xl font-bold leading-none">{ticket.contractorName}</p>
                    <p className="text-xs text-muted-foreground mt-2">Active Service Agreement</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full print:hidden">
                    <ExternalLink className="h-3 w-3 mr-2" /> Vendor Portal
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 space-y-4 print:hidden">
                  <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto">
                    <Wrench className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground italic px-4">Awaiting contractor dispatch for this maintenance item.</p>
                  <AssignContractorDialog ticketId={ticket.id} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}