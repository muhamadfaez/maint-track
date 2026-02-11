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
            (t) => t.status === 'Rectified' || t.status === 'Closed'
        );
        const pending = tickets.filter(
            (t) => t.status === 'In Progress / Pending'
        );

        const TableRow = ({ ticket }: { ticket: MaintenanceTicket }) => (
            <tr className="text-sm break-inside-avoid">
                <td className="p-3 border border-black align-top">
                    {format(parseISO(ticket.createdAt), 'dd/MM/yyyy')}
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

        return (
            <div ref={ref} className="bg-white p-8 text-black w-[210mm] min-h-[297mm] mx-auto hidden print:block box-border">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold uppercase mb-4 text-center border-b-2 border-black pb-4">Maintenance Report</h1>
                    <div className="flex justify-between text-sm font-medium mb-4">
                        <span><strong>Period:</strong> {period}</span>
                        <span><strong>Generated:</strong> {format(new Date(), 'dd/MM/yyyy')}</span>
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
                        {/* Rectified Section */}
                        <tr className="bg-gray-100/50">
                            <td colSpan={4} className="p-3 border border-black font-bold text-lg">
                                Rectified
                            </td>
                        </tr>
                        {rectified.length > 0 ? (
                            rectified.map((t) => <TableRow key={t.id} ticket={t} />)
                        ) : (
                            <tr>
                                <td colSpan={4} className="p-4 border border-black text-center text-gray-500 italic">
                                    No rectified items in this period.
                                </td>
                            </tr>
                        )}

                        {/* Pending Section */}
                        <tr className="bg-gray-100/50">
                            <td colSpan={4} className="p-3 border border-black font-bold text-lg">
                                Pending
                            </td>
                        </tr>
                        {pending.length > 0 ? (
                            pending.map((t) => <TableRow key={t.id} ticket={t} />)
                        ) : (
                            <tr>
                                <td colSpan={4} className="p-4 border border-black text-center text-gray-500 italic">
                                    No pending items in this period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="mt-12 pt-8 grid grid-cols-2 gap-12 text-sm">
                    <div>
                        <p className="font-bold mb-8">Prepared By:</p>
                        <div className="border-b border-black w-2/3"></div>
                        <p className="mt-2 text-xs text-gray-500">Facility Manager</p>
                    </div>
                    <div>
                        <p className="font-bold mb-8">Verified By:</p>
                        <div className="border-b border-black w-2/3"></div>
                        <p className="mt-2 text-xs text-gray-500">Director of Operations</p>
                    </div>
                </div>
            </div>
        );
    }
);

ReportTable.displayName = 'ReportTable';
