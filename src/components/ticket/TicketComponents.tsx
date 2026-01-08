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
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
      case 'In Progress':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
      case 'Waiting for Quote':
      case 'Pending Materials':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Closed':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };
  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 font-medium", getStatusStyles(status), className)}>
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
        <div className="flex items-center gap-1 text-xs font-bold text-red-600 uppercase tracking-wider">
          <Zap className="h-3 w-3 fill-red-600" /> Emergency
        </div>
      );
    case 'High':
      return (
        <div className="flex items-center gap-1 text-xs font-semibold text-orange-600">
          <AlertCircle className="h-3 w-3" /> High
        </div>
      );
    case 'Medium':
      return (
        <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
          <AlertTriangle className="h-3 w-3" /> Medium
        </div>
      );
    case 'Low':
      return (
        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
          <ArrowDownCircle className="h-3 w-3" /> Low
        </div>
      );
  }
}