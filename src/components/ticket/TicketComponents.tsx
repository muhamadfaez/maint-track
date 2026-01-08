import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TicketStatus } from '@shared/types';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownCircle,
  Zap
} from 'lucide-react';
interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = (s: TicketStatus) => {
    switch (s) {
      case 'New':
        return 'bg-teal-50 text-[hsl(179,100%,28%)] border-teal-100/50 dark:bg-teal-950/30 dark:text-teal-400';
      case 'In Progress':
        return 'bg-amber-50 text-amber-700 border-amber-100/50 dark:bg-amber-900/20 dark:text-amber-400';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100/50 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'Waiting for Quote':
      case 'Pending Materials':
        return 'bg-violet-50 text-violet-700 border-violet-100/50 dark:bg-violet-900/20 dark:text-violet-400';
      case 'Closed':
        return 'bg-slate-50 text-slate-600 border-slate-200/50 dark:bg-slate-800 dark:text-slate-400';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };
  return (
    <Badge variant="outline" className={cn("px-2.5 py-0.5 font-semibold text-[10px] uppercase tracking-wider", getStatusStyles(status), className)}>
      {status}
    </Badge>
  );
}
interface PriorityIndicatorProps {
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
}

export function PriorityIndicator({ priority }: PriorityIndicatorProps) {
  switch (priority) {
    case 'Emergency':
      return (
        <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full dark:bg-rose-950/30 dark:text-rose-400">
          <Zap className="h-3 w-3 fill-rose-600 dark:fill-rose-400" /> Emergency
        </div>
      );
    case 'High':
      return (
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-full dark:bg-orange-950/30 dark:text-orange-400">
          <AlertCircle className="h-3 w-3" /> High
        </div>
      );
    case 'Medium':
      return (
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-full dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" /> Medium
        </div>
      );
    case 'Low':
      return (
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full dark:bg-slate-800 dark:text-slate-400">
          <ArrowDownCircle className="h-3 w-3" /> Low
        </div>
      );
  }
}