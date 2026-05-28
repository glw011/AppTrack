import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { applicationsApi } from '@/api/applications';
import { companiesApi } from '@/api/companies';

const schema = z.object({
  jobTitle: z.string().min(1, 'Job title required'),
  companyId: z.string().uuid().optional(),
  status: z.enum(['saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn']).default('saved'),
  url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  salaryMin: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  salaryMax: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  location: z.string().optional(),
  remote: z.boolean().default(false),
  jobDescription: z.string().optional(),
  dateApplied: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  d => {
    const min = d.salaryMin ? Number(d.salaryMin) : undefined;
    const max = d.salaryMax ? Number(d.salaryMax) : undefined;
    return min == null || max == null || max >= min;
  },
  { message: 'Max salary must be ≥ min salary', path: ['salaryMax'] },
);
type FormValues = z.infer<typeof schema>;

export default function NewApplication() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: companies } = useQuery({
    queryKey: ['companies', { limit: 100 }],
    queryFn: () => companiesApi.list({ limit: 100 }),
  });

  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'saved', remote: false },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => applicationsApi.create({
      ...data,
      salaryMin: data.salaryMin ? Number(data.salaryMin) : undefined,
      salaryMax: data.salaryMax ? Number(data.salaryMax) : undefined,
      url: data.url || undefined,
      dateApplied: data.dateApplied || undefined,
    }),
    onSuccess: app => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Application created');
      navigate(`/applications/${app.id}`);
    },
    onError: () => toast.error('Failed to create application'),
  });

  return(
    <div>
      <Header title="New Application" />
      <div className="p-6">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="max-w-2xl space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Position</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input id="jobTitle" placeholder="Software Engineer" {...register('jobTitle')} />
                {errors.jobTitle && <p className="text-xs text-destructive">{errors.jobTitle.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Company</Label>
                <Controller
                  name="companyId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={v => field.onChange(v || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company…" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies?.data?.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['saved','applied','interviewing','offer','rejected','withdrawn'].map(s => (
                            <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dateApplied">Date Applied</Label>
                  <Input id="dateApplied" type="date" {...register('dateApplied')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="url">Job URL</Label>
                <Input id="url" type="url" placeholder="https://…" {...register('url')} />
                {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Location &amp; Salary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" placeholder="San Francisco, CA" {...register('location')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="invisible">Remote</Label>
                  <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" {...register('remote')} className="rounded border-input" />
                    Remote
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="salaryMin">Min Salary ($)</Label>
                  <Input id="salaryMin" type="number" placeholder="80000" {...register('salaryMin')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salaryMax">Max Salary ($)</Label>
                  <Input id="salaryMax" type="number" placeholder="120000" {...register('salaryMax')} />
                  {errors.salaryMax && <p className="text-xs text-destructive">{errors.salaryMax.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea id="jobDescription" rows={6} placeholder="Paste job description here…" {...register('jobDescription')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={3} placeholder="Any notes about this application…" {...register('notes')} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Save Application'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
