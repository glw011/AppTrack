import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Linkedin, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { contactsApi, type CreateContactBody } from '@/api/contacts';
import { useForm } from 'react-hook-form';

export default function Contacts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { search }],
    queryFn: () => contactsApi.list({ search: search || undefined }),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateContactBody>();

  const createMutation = useMutation({
    mutationFn: contactsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact added');
      setOpen(false);
      reset();
    },
    onError: () => toast.error('Failed to add contact'),
  });

  const deleteMutation = useMutation({
    mutationFn: contactsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });

  return(
    <div>
      <Header
        title="Contacts"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />Add Contact
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : !data?.data?.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No contacts yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map(contact => (
              <Card key={contact.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      {contact.title && <p className="text-sm text-muted-foreground">{contact.title}</p>}
                      <div className="mt-1.5 flex flex-col gap-0.5">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Mail className="h-3 w-3" />{contact.email}
                          </a>
                        )}
                        {contact.linkedin_url && (
                          <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Linkedin className="h-3 w-3" />LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(contact.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="Jane Smith" {...register('name', { required: true })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input placeholder="Engineering Manager" {...register('title')} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="jane@example.com" {...register('email')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>LinkedIn URL</Label>
              <Input type="url" placeholder="https://linkedin.com/in/…" {...register('linkedinUrl')} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
