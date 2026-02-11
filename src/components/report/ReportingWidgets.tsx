import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  LayoutList
} from 'lucide-react';
import type { MaintenanceTicket, MaintenanceCategory, TicketStatus } from '@shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

const COLORS = ['#00918e', '#00b5b1', '#f59e0b', '#8b5cf6', '#f43f5e', '#64748b', '#0ea5e9', '#10b981'];

interface WidgetProps {
  tickets: MaintenanceTicket[];
}

export function KPIGrid({ tickets }: WidgetProps) {
  const total = tickets.length;
  const completed = tickets.filter(t => t.status === 'Rectified' || t.status === 'Closed').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const critical = tickets.filter(t => (t.priority === 'Urgent' || t.priority === 'High') && t.status === 'In Progress / Pending').length;
  const pending = tickets.filter(t => t.status === 'In Progress / Pending').length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6 break-inside-avoid">
      <Card className="print:shadow-none print:border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          <LayoutList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <p className="text-xs text-muted-foreground">in selected period</p>
        </CardContent>
      </Card>
      <Card className="print:shadow-none print:border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <p className="text-xs text-muted-foreground">{completed} resolved tickets</p>
        </CardContent>
      </Card>
      <Card className="print:shadow-none print:border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Open</CardTitle>
          <AlertCircle className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{critical}</div>
          <p className="text-xs text-muted-foreground">requiring immediate attention</p>
        </CardContent>
      </Card>
      <Card className="print:shadow-none print:border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pending}</div>
          <p className="text-xs text-muted-foreground">active workflows</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function CategoryDistributionChart({ tickets }: WidgetProps) {
  const data = tickets.reduce((acc, t) => {
    const existing = acc.find(item => item.name === t.category);
    if (existing) existing.value += 1;
    else acc.push({ name: t.category, value: 1 });
    return acc;
  }, [] as { name: MaintenanceCategory; value: number }[]);

  if (data.length === 0) {
    return <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground text-sm">No data available</div>;
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TicketStatusChart({ tickets }: WidgetProps) {
  const statusCounts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<TicketStatus, number>);

  const data = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground text-sm">No data available</div>;
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={120} fontSize={10} axisLine={false} tickLine={false} fontWeight={600} />
          <Tooltip
            cursor={{ fill: 'rgba(0,145,142,0.05)' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
          />
          <Bar dataKey="value" fill="#00918e" radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyVolumeChart({ tickets }: WidgetProps) {
  // Determine date range from tickets or default to last 6 months
  const dates = tickets.map(t => parseISO(t.createdAt)).filter(d => !isNaN(d.getTime()));

  let start = subMonths(new Date(), 5);
  let end = new Date();

  if (dates.length > 0) {
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    if (minDate < start) start = minDate;
    if (maxDate > end) end = maxDate;
  }

  // Generate all months in interval
  const months = eachMonthOfInterval({ start, end });

  const data = months.map(month => {
    const monthStr = format(month, 'MMM yyyy');
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const count = tickets.filter(t => {
      const d = parseISO(t.createdAt);
      return d >= monthStart && d <= monthEnd;
    }).length;

    return { month: monthStr, volume: count };
  });

  if (data.every(d => d.volume === 0)) {
    return <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground text-sm">No activity in this period</div>;
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00918e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#00918e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
          <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} fontWeight={600} />
          <YAxis fontSize={10} axisLine={false} tickLine={false} fontWeight={600} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
          />
          <Area type="monotone" dataKey="volume" stroke="#00918e" fillOpacity={1} fill="url(#colorVol)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}