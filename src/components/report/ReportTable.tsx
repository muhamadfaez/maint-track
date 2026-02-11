import React from 'react';
import type { MaintenanceTicket } from '@shared/types';
import { format, parseISO } from 'date-fns';

interface ReportTableProps {
    tickets: MaintenanceTicket[];
    period: string;
}

export const ReportTable = React.forwardRef<HTMLDivElement, ReportTableProps>(
    ({ tickets, period }, ref) => {
        // Group tickets
        const rectified = tickets.filter(
            (t) => t.status === 'Completed' || t.status === 'Closed'
        );
        const pending = tickets.filter(
            (t) => t.status !== 'Completed' && t.status !== 'Closed'
        );

        const TableRow = ({ ticket }: { ticket: MaintenanceTicket }) => (
            <tr className="border-b border-black/20 text-xs break-inside-avoid">
                <td className="p-2 border-r border-black/20 w-[15%] align-top">
                    {format(parseISO(ticket.createdAt), 'dd/MM/yyyy')}
                </td>
                <td className="p-2 border-r border-black/20 w-[20%] align-top">
                    {ticket.category}
                </td>
                <td className="p-2 border-r border-black/20 w-[50%] align-top">
                    <div className="font-bold mb-1">{ticket.title}</div>
                    <div className="text-[10px] text-gray-600">{ticket.location}</div>
                </td>
                <td className="p-2 w-[15%] align-top font-bold text-center">
                    {ticket.status === 'Completed' || ticket.status === 'Closed'
                        ? 'Rectified'
                        : ticket.status}
                </td>
            </tr>
        );

        return (
            <div ref={ref} className="bg-white p-8 font-serif text-black max-w-[210mm] mx-auto hidden print:block">
                {/* Header */}
                <div className="mb-8 border-b-2 border-black pb-4">
                    <h1 className="text-2xl font-bold uppercase mb-2">Maintenance Report</h1>
                    <div className="flex justify-between text-sm">
                        <span><strong>Period:</strong> {period}</span>
                        <span><strong>Generated:</strong> {format(new Date(), 'dd/MM/yyyy')}</span>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full border-2 border-black border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b-2 border-black text-left text-sm font-bold uppercase">
                            <th className="p-2 border-r border-black">Date</th>
                            <th className="p-2 border-r border-black">Category</th>
                            <th className="p-2 border-r border-black">Report / Issue (Refined)</th>
                            <th className="p-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Rectified Section */}
                        <tr className="bg-gray-50 border-b border-black font-bold">
                            <td colSpan={4} className="p-2 uppercase tracking-wide">
                                Rectified
                            </td>
                        </tr>
                        {rectified.length > 0 ? (
                            rectified.map((t) => <TableRow key={t.id} ticket={t} />)
                        ) : (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-gray-500 italic border-b border-black/20">
                                    No rectified items in this period.
                                </td>
                            </tr>
                        )}

                        {/* Pending Section */}
                        <tr className="bg-gray-50 border-b border-black border-t-2 font-bold">
                            <td colSpan={4} className="p-2 uppercase tracking-wide">
                                Pending
                            </td>
                        </tr>
                        {pending.length > 0 ? (
                            pending.map((t) => <TableRow key={t.id} ticket={t} />)
                        ) : (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-gray-500 italic">
                                    No pending items in this period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="mt-8 pt-8 border-t border-black grid grid-cols-2 gap-12 text-sm">
                    <div>
                        <p className="font-bold mb-8">Prepared By:</p>
                        <div className="border-b border-black w-2/3"></div>
                    </div>
                    <div>
                        <p className="font-bold mb-8">Verified By:</p>
                        <div className="border-b border-black w-2/3"></div>
                    </div>
                </div>
            </div>
        );
    }
);

ReportTable.displayName = 'ReportTable';
