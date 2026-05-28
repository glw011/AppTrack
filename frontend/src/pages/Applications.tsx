import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Download, ChevronLeft, ChevronRight, ExternalLink, MapPin, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { applicationsApi } from '@/api/applications';
import { formatDate, formatSalary } from '@/lib/utils';
import type { ApplicationStatus } from '@/types';

const STATUS_OPTIONS: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'discovered', label: 'Discovered' },
  { value: 'awaiting_approval', label: 'Awaiting Approval' },
  { value: 'approved', label: 'Approved' },
];

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date Added' },
  { value: 'date_applied', label: 'Date Applied' },
  { value: 'date_saved', label: 'Date Saved' },
  { value: 'job_title', label: 'Job Title' },
] as const;

export default function Applications() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all');
  const [sort, setSort] = useState<'created_at' | 'date_applied' | 'date_saved' | 'job_title'>('created_at');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['applications', { search, status, sort, page }],
    queryFn: () => applicationsApi.list({
      search: search || undefined,
      status: status === 'all' ? undefined : status,
      sort,
      page,
      limit: 20,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: applicationsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Application deleted');
    },
  });

  const handleExport = async () => {
    try{
      const blob = await applicationsApi.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `applications-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    catch{
      toast.error('Export failed');
    }
  };

  return(
    <div>
      <Header
        title="Applications"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" />Export CSV
            </Button>
            <Button asChild size="sm">
              <Link to="/applications/new">
                <Plus className="mr-1.5 h-4 w-4" />New
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search title or company…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={status} onValueChange={(v: ApplicationStatus | 'all') => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v: typeof sort) => setSort(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Added</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !data?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No applications found.{' '}
                    <Link to="/applications/new" className="text-primary hover:underline">Add your first one</Link>.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map(app => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      <Link to={`/applications/${app.id}`} className="hover:underline">
                        {app.job_title}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        {app.location && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />{app.location}
                          </span>
                        )}
                        {app.remote && (
                          <span className="flex items-center gap-0.5 text-xs text-blue-600">
                            <Wifi className="h-3 w-3" />Remote
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{app.company_name ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={app.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSalary(app.salary_min, app.salary_max)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(app.date_applied)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(app.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {app.url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={app.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(app.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {((page - 1) * 20) + 1}–{Math.min(page * 20, data.pagination.total)} of {data.pagination.total}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setPage(p => p + 1)} disabled={page >= data.pagination.pages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
