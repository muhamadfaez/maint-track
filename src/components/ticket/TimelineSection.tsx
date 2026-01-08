import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Repeat,
  UserPlus,
  PhoneCall,
  Camera,
  Send,
  Clock
} from 'lucide-react';
import { api } from '@/lib/api-client';
import type { TimelineEvent, ActionCategory } from '@shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FileUpload } from './FileUpload';

const categoryIcons: Record<ActionCategory, React.ElementType> = {
  'Comment': MessageSquare,
  'Status Change': Repeat,
  'Contractor Assignment': UserPlus,
  'Vendor Comm': PhoneCall,
  'Photo Upload': Camera
};

const categoryColors: Record<ActionCategory, string> = {
  'Comment': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  'Status Change': 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  'Contractor Assignment': 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  'Vendor Comm': 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  'Photo Upload': 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
};

interface TimelineSectionProps {
  ticketId: string;
}

export function TimelineSection({ ticketId }: TimelineSectionProps) {
  const [note, setNote] = React.useState('');
  const [attachmentUrl, setAttachmentUrl] = React.useState('');
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['timeline', ticketId],
    queryFn: () => api<TimelineEvent[]>(`/api/tickets/${ticketId}/timeline`),
  });

  const mutation = useMutation({
    mutationFn: (data: { note: string, attachmentUrl?: string }) =>
      api(`/api/tickets/${ticketId}/timeline`, {
        method: 'POST',
        body: JSON.stringify({
          category: data.attachmentUrl ? 'Photo Upload' : 'Comment',
          note: data.note,
          author: 'Staff User',
          attachmentUrl: data.attachmentUrl
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setNote('');
      setAttachmentUrl('');
      toast.success('Action log updated');
    }
  });

  const handleAddNote = () => {
    if (!note.trim() && !attachmentUrl) return;
    mutation.mutate({ note: note.trim() || 'Attached evidence', attachmentUrl });
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" /> Action Log
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : events?.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No actions logged yet.</div>
          ) : (
            events?.map((event, idx) => {
              const Icon = categoryIcons[event.category] || MessageSquare;
              const isImage = event.attachmentUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              const isVideo = event.attachmentUrl?.match(/\.(mp4|webm|ogg)$/i);

              return (
                <div key={event.id} className="relative pl-8 group">
                  {/* Timeline Line */}
                  {idx !== events.length - 1 && (
                    <div className="absolute left-3 top-7 bottom-[-24px] w-px bg-border group-last:hidden" />
                  )}
                  {/* Icon Node */}
                  <div className={cn(
                    "absolute left-0 top-0 h-6 w-6 rounded-full flex items-center justify-center ring-4 ring-background",
                    categoryColors[event.category]
                  )}>
                    <Icon className="h-3 w-3" />
                  </div>
                  {/* Content */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{event.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(parseISO(event.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90">{event.note}</p>

                    {event.attachmentUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border bg-muted/20">
                        {isImage ? (
                          <img
                            src={event.attachmentUrl}
                            alt="Evidence"
                            className="max-h-60 w-auto object-contain"
                          />
                        ) : isVideo ? (
                          <video
                            src={event.attachmentUrl}
                            controls
                            className="max-h-60 w-full"
                          />
                        ) : (
                          <a
                            href={event.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 text-sm text-primary hover:underline"
                          >
                            <Camera className="h-4 w-4" /> View Attachment
                          </a>
                        )}
                      </div>
                    )}

                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                      {event.category}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="pt-4 border-t flex flex-col gap-3">
          <Textarea
            placeholder="Add an update or comment..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <FileUpload
            onUploadComplete={(url) => setAttachmentUrl(url)}
            label="Attach photo/video proof"
            className="mt-1"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAddNote} disabled={mutation.isPending || (!note.trim() && !attachmentUrl)}>
              <Send className="h-4 w-4 mr-2" />
              {mutation.isPending ? "Adding..." : "Log Action"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}