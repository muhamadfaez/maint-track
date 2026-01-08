import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import type { MaintenanceTicket, MaintenanceCategory, TicketStatus } from '@shared/types';
const COLORS = ['#00918e', '#00b5b1', '#f59e0b', '#8b5cf6', '#f43f5e', '#64748b', '#0ea5e9', '#10b981'];
interface WidgetProps {
  tickets: MaintenanceTicket[];
}
export function CategoryDistributionChart({ tickets }: WidgetProps) {
  const data = tickets.reduce((acc, t) => {
    const existing = acc.find(item => item.name === t.category);
    if (existing) existing.value += 1;
    else acc.push({ name: t.category, value: 1 });
    return acc;
  }, [] as { name: MaintenanceCategory; value: number }[]);
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
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={100} fontSize={10} axisLine={false} tickLine={false} fontWeight={600} />
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
  // Simplified mock data for monthly trends since real data might be sparse
  const data = [
    { month: 'Oct', volume: 12 },
    { month: 'Nov', volume: 18 },
    { month: 'Dec', volume: 15 },
    { month: 'Jan', volume: tickets.length },
  ];
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