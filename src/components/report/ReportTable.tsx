import React from 'react';
import type { MaintenanceTicket } from '@shared/types';
import { format, parseISO, isValid } from 'date-fns';

interface ReportTableProps {
    tickets: MaintenanceTicket[];
    period: string;
    systemName?: string;
    logoSrc?: string;
}

export const ReportTable = React.forwardRef<HTMLDivElement, ReportTableProps>(
    ({ tickets, period, systemName = 'MTrack System', logoSrc = '/apple-touch-icon.png' }, ref) => {
        const formatDate = (value: string, pattern: string) => {
            const date = parseISO(value);
            return isValid(date) ? format(date, pattern) : '—';
        };

        // Group tickets
        const rectified = tickets.filter(
            (t) => t.status === 'Rectified' || t.status === 'Closed'
        ).sort((a, b) => a.category.localeCompare(b.category));
        const pending = tickets.filter(
            (t) => t.status === 'In Progress / Pending'
        ).sort((a, b) => a.category.localeCompare(b.category));

        const TableRow = ({ ticket }: { ticket: MaintenanceTicket }) => (
            <tr className="text-sm break-inside-avoid">
                <td className="p-3 border border-black align-top">
                    {formatDate(ticket.createdAt, 'dd/MM/yyyy')}
                </td>
                <td className="p-3 border border-black align-top">
                    {ticket.category}
                </td>
                <td className="p-3 border border-black align-top">
                    <span className="font-medium">{ticket.title}</span> at {ticket.location}
                    {ticket.description && (
                        <div className="text-xs text-slate-600 mt-1">{ticket.description}</div>
                    )}
                </td>
                <td className="p-3 border border-black align-top text-center font-medium">
                    {ticket.status === 'Rectified' || ticket.status === 'Closed'
                        ? 'Rectified'
                        : 'Pending'}
                </td>
            </tr>
        );

        type Row =
            | { type: 'section'; title: string }
            | { type: 'ticket'; ticket: MaintenanceTicket }
            | { type: 'empty'; message: string };

        const rows: Row[] = [
            { type: 'section', title: 'Rectified' } as Row,
            ...(rectified.length > 0
                ? rectified.map((ticket) => ({ type: 'ticket', ticket } as Row))
                : [{ type: 'empty', message: 'No rectified items in this period.' } as Row]),
            { type: 'section', title: 'Pending' } as Row,
            ...(pending.length > 0
                ? pending.map((ticket) => ({ type: 'ticket', ticket } as Row))
                : [{ type: 'empty', message: 'No pending items in this period.' } as Row]),
        ];

        const ROWS_PER_PAGE = 13;
        const pages: Row[][] = [];
        let index = 0;
        while (index < rows.length) {
            let end = Math.min(index + ROWS_PER_PAGE, rows.length);
            if (rows[end - 1]?.type === 'section') {
                end -= 1;
            }
            if (end <= index) {
                end = Math.min(index + ROWS_PER_PAGE, rows.length);
            }
            if (rows[index]?.type === 'section' && end - index === 1 && end < rows.length) {
                end = Math.min(end + 1, rows.length);
            }
            pages.push(rows.slice(index, end));
            index = end;
        }

        return (
            <div ref={ref} className="bg-white text-black w-[210mm] mx-auto box-border">
                {pages.map((pageRows, pageIndex) => (
                    <div key={`report-page-${pageIndex}`} className="report-page w-[210mm] min-h-[297mm] p-8 box-border">
                        {/* Header */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <img src={logoSrc} alt="System logo" className="h-10 w-10 object-contain" />
                                    <div>
                                        <p className="text-xs uppercase tracking-widest font-semibold text-slate-600">{systemName}</p>
                                        <h1 className="text-2xl font-bold uppercase">Maintenance Report</h1>
                                    </div>
                                </div>
                                <div className="text-right text-sm font-medium">
                                    <div><strong>Period:</strong> {period}</div>
                                    <div><strong>Generated:</strong> {format(new Date(), 'dd/MM/yyyy')}</div>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <table className="w-full border-collapse border border-black text-sm">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="p-3 border border-black text-left font-bold w-[120px]">Date</th>
                                    <th className="p-3 border border-black text-left font-bold w-[150px]">Category</th>
                                    <th className="p-3 border border-black text-left font-bold">Report / Issue (Refined)</th>
                                    <th className="p-3 border border-black text-center font-bold w-[100px]">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map((row, rowIndex) => {
                                    if (row.type === 'section') {
                                        return (
                                            <tr key={`section-${pageIndex}-${rowIndex}`} className="bg-gray-100/50">
                                                <td colSpan={4} className="p-3 border border-black font-bold text-lg">
                                                    {row.title}
                                                </td>
                                            </tr>
                                        );
                                    }
                                    if (row.type === 'empty') {
                                        return (
                                            <tr key={`empty-${pageIndex}-${rowIndex}`}>
                                                <td colSpan={4} className="p-4 border border-black text-center text-gray-500 italic">
                                                    {row.message}
                                                </td>
                                            </tr>
                                        );
                                    }
                                    return <TableRow key={row.ticket.id} ticket={row.ticket} />;
                                })}
                            </tbody>
                        </table>

                        {/* Footer (last page only) */}
                        {pageIndex === pages.length - 1 && (
                            <div className="mt-12 pt-8 grid grid-cols-2 gap-12 text-sm">
                                <div>
                                    <p className="font-bold mb-8">Prepared By:</p>
                                    <div className="border-b border-black w-2/3"></div>
                                    <p className="mt-2 text-xs text-gray-500">Facility & Maintenance Unit</p>
                                </div>
                                <div>
                                    <p className="font-bold mb-8">Verified By:</p>
                                    <div className="border-b border-black w-2/3"></div>
                                    <p className="mt-2 text-xs text-gray-500">Deputy Director of KICT</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }
);

ReportTable.displayName = 'ReportTable';
