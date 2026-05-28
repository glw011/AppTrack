import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { companiesApi, type CreateCompanyBody } from '@/api/companies';
import { useForm } from 'react-hook-form';

export default function Companies() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['companies', { search }],
    queryFn: () => companiesApi.list({ search: search || undefined, limit: 50 }),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateCompanyBody>();

  const createMutation = useMutation({
    mutationFn: companiesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company created');
      setOpen(false);
      reset();
    },
    onError: () => toast.error('Failed to create company'),
  });

  return (
    <div>
      <Header
        title="Companies"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />New
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search companies…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : !data?.data?.length ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 opacity-30" />
            <p className="text-sm">No companies yet. Add one to track your applications by company.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map(company => (
              <Link key={company.id} to={`/companies/${company.id}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{company.name}</p>
                      {company.industry && (
                        <p className="text-sm text-muted-foreground">{company.industry}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Company</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="Acme Corp" {...register('name', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" placeholder="https://…" {...register('website')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" placeholder="Technology" {...register('industry')} />
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
