import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { MAINTENANCE_CATEGORIES, MaintenanceTicket } from '@shared/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { PhotoUpload } from './PhotoUpload';

const formSchema = z.object({
    title: z.string().min(5, "Title is mandatory (min 5 chars)"),
    description: z.string().optional().nullable(),
    location: z.string().min(3, "Location is mandatory"),
    category: z.string().min(1, "Category is mandatory"),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent'], {
        message: "Priority is mandatory",
    }),
    reporter: z.string().optional().nullable(),
    createdAt: z.date().optional().nullable(),
    initialPhotoUrl: z.string().optional().nullable(),
});

interface EditTicketDialogProps {
    ticket: MaintenanceTicket;
}

export function EditTicketDialog({ ticket }: EditTicketDialogProps) {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: ticket.title,
            description: ticket.description || '',
            location: ticket.location,
            category: ticket.category,
            priority: ticket.priority,
            reporter: ticket.reporter || 'Faez',
            createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date(),
            initialPhotoUrl: ticket.initialPhotoUrl,
        },
    });

    // Sync form if ticket changes (though it shouldn't while open)
    useEffect(() => {
        if (open) {
            form.reset({
                title: ticket.title,
                description: ticket.description || '',
                location: ticket.location,
                category: ticket.category,
                priority: ticket.priority,
                reporter: ticket.reporter || 'Staff User',
                createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date(),
                initialPhotoUrl: ticket.initialPhotoUrl,
            });
        }
    }, [open, ticket, form]);

    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof formSchema>) =>
            api(`/api/tickets/${ticket.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    ...values,
                    createdAt: values.createdAt?.toISOString()
                })
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            toast.success('Ticket updated successfully');
            setOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update ticket');
        }
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        mutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                    <Edit2 className="h-4 w-4" /> Edit Ticket
                </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] flex-col overflow-hidden border-none p-0 glass sm:max-h-[95vh] sm:max-w-[650px]">
                <div className="p-3 sm:p-6 overflow-y-auto custom-scrollbar">
                    <DialogHeader className="mb-3 sm:mb-6 text-left">
                        <DialogTitle className="text-lg sm:text-xl font-bold">Edit Maintenance Ticket</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 sm:gap-y-4">
                                {/* Left Column */}
                                <div className="space-y-3 sm:space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex gap-1.5 items-center text-xs sm:text-sm">
                                                    Issue Title <span className="text-rose-500 font-bold">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value || ''} className="h-9 sm:h-10" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex gap-1.5 items-center text-xs sm:text-sm">
                                                    Location <span className="text-rose-500 font-bold">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value || ''} className="h-9 sm:h-10" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Reporter & Date Grouped into 2 cols on mobile */}
                                    <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name="reporter"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs sm:text-sm">Reported By</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                                                                <SelectValue placeholder="Select Reporter" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Faez" className="text-xs sm:text-sm">Faez</SelectItem>
                                                            <SelectItem value="Erry Laso" className="text-xs sm:text-sm">Erry Laso</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="createdAt"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel className="text-xs sm:text-sm">Report Date</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant={"outline"}
                                                                    className={cn(
                                                                        "w-full pl-3 text-left font-normal h-9 sm:h-10 text-xs sm:text-sm",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {field.value ? (
                                                                        format(field.value, "PP")
                                                                    ) : (
                                                                        <span>Pick date</span>
                                                                    )}
                                                                    <CalendarIcon className="ml-auto h-3 w-3 sm:h-4 sm:w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value || undefined}
                                                                onSelect={field.onChange}
                                                                disabled={(date) =>
                                                                    date > new Date() || date < new Date("1900-01-01")
                                                                }
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4">
                                        <FormField
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="flex gap-1.5 items-center text-xs sm:text-sm">
                                                        Category <span className="text-rose-500 font-bold">*</span>
                                                    </FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                                                                <SelectValue placeholder="Select" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {MAINTENANCE_CATEGORIES.map(c => (
                                                                <SelectItem key={c} value={c} className="text-xs sm:text-sm">{c}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="priority"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="flex gap-1.5 items-center text-xs sm:text-sm">
                                                        Priority <span className="text-rose-500 font-bold">*</span>
                                                    </FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                                                                <SelectValue placeholder="Select" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Low" className="text-xs sm:text-sm">Low</SelectItem>
                                                            <SelectItem value="Medium" className="text-xs sm:text-sm">Medium</SelectItem>
                                                            <SelectItem value="High" className="text-xs sm:text-sm">High</SelectItem>
                                                            <SelectItem value="Urgent" className="text-xs sm:text-sm">Urgent</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="initialPhotoUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <PhotoUpload
                                                        value={field.value || undefined}
                                                        onChange={field.onChange}
                                                        variant="horizontal"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs sm:text-sm">Description / Details</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Provide more context..."
                                                className="min-h-[70px] sm:min-h-[100px] bg-white/50 text-xs sm:text-sm"
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2 sm:gap-3 pt-1">
                                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-9 sm:h-10 text-xs sm:text-sm">
                                    Cancel
                                </Button>
                                <Button type="submit" className="btn-gradient px-6 sm:px-8 h-9 sm:h-10 text-xs sm:text-sm" disabled={mutation.isPending}>
                                    {mutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
