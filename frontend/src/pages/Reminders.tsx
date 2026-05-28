import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, CheckCircle, Circle, Clock, Trash2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { remindersApi, type CreateReminderBody } from '@/api/reminders';
import { formatDate } from '@/lib/utils';
import { useForm } from 'react-hook-form';

export default function Reminders() {
  const qc = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reminders', { completed: showCompleted ? undefined : false }],
    queryFn: () => remindersApi.list({ completed: showCompleted ? undefined : false }),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateReminderBody>();

  const createMutation = useMutation({
    mutationFn: remindersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Reminder set');
      setOpen(false);
      reset();
    },
  });

  const completeMutation = useMutation({
    mutationFn: remindersApi.complete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: remindersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const overdue = data?.data?.filter(r => !r.completed && new Date(r.due_at) < new Date()) ?? [];

  return(
    <div>
      <Header
        title="Reminders"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />New Reminder
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCompleted(false)}
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${!showCompleted ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setShowCompleted(true)}
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${showCompleted ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            All
          </button>
        </div>

        {overdue.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">{overdue.length} overdue reminder{overdue.length > 1 ? 's' : ''}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : !data?.data?.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No reminders.</p>
        ) : (
          <ul className="space-y-2">
            {data.data.map(r => {
              const isPast = !r.completed && new Date(r.due_at) < new Date();
              return(
                <li
                  key={r.id}
                  className={`flex items-center gap-3 rounded-lg border bg-white p-3 ${r.completed ? 'opacity-50' : ''}`}
                >
                  <button
                    onClick={() => !r.completed && completeMutation.mutate(r.id)}
                    disabled={r.completed || completeMutation.isPending}
                    className="shrink-0"
                  >
                    {r.completed
                      ? <CheckCircle className="h-5 w-5 text-green-500" />
                      : <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                    }
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${r.completed ? 'line-through' : ''}`}>{r.title}</p>
                    <p className={`flex items-center gap-1 text-xs ${isPast ? 'text-red-500' : 'text-muted-foreground'}`}>
                      <Clock className="h-3 w-3" />
                      {formatDate(r.due_at)}
                      {isPast && ' — overdue'}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(r.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Reminder</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="Follow up with recruiter" {...register('title', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date *</Label>
              <Input type="datetime-local" {...register('dueAt', { required: true })} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
