import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { api } from '@/lib/api-client';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
const CONTRACTORS = [
  "QuickFix Plumbing",
  "Otis Maintenance",
  "CoolAir Solutions",
  "RoofMasters",
  "GreenScape",
  "Securitas",
  "CleanTeam",
  "ABC Electric"
];
interface AssignContractorDialogProps {
  ticketId: string;
}
export function AssignContractorDialog({ ticketId }: AssignContractorDialogProps) {
  const [open, setOpen] = useState(false);
  const [contractor, setContractor] = useState('');
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: { contractorName: string; note: string }) =>
      api(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          contractorName: data.contractorName,
          status: 'Assigned',
          assignmentNote: data.note 
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', ticketId] });
      toast.success('Contractor assigned');
      setOpen(false);
      setContractor('');
      setNote('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign contractor');
    }
  });
  const handleAssign = () => {
    if (!contractor) return;
    mutation.mutate({ contractorName: contractor, note: note || `Assigned to ${contractor}` });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">
          <UserPlus className="h-4 w-4 mr-2" /> Assign Contractor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Maintenance Contractor</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="contractor">Select Vendor</Label>
            <Select onValueChange={setContractor} value={contractor}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a contractor..." />
              </SelectTrigger>
              <SelectContent>
                {CONTRACTORS.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Assignment Note (Optional)</Label>
            <Input 
              id="note" 
              placeholder="e.g., Scheduled for Tuesday morning" 
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAssign} disabled={!contractor || mutation.isPending}>
            {mutation.isPending ? "Assigning..." : "Confirm Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}