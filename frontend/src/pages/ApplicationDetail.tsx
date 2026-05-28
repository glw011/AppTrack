import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, ExternalLink, MapPin, Wifi, Calendar,
  DollarSign, MessageSquarePlus, Trash2, Mail, FileText, FileCode,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { applicationsApi } from '@/api/applications';
import { pipelineApi } from '@/api/pipeline';
import { formatDate, formatSalary } from '@/lib/utils';
import type { ApplicationStatus, CoverLetter, ResumeDraft } from '@/types';

const MANUAL_STATUSES: ApplicationStatus[] = ['saved','applied','interviewing','offer','rejected','withdrawn'];

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [noteBody, setNoteBody] = useState('');

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsApi.get(id!),
    enabled: !!id,
  });

  const { data: drafts } = useQuery({
    queryKey: ['review-data', id],
    queryFn: () => pipelineApi.getDraftData(id!),
    enabled: !!id && app?.status === 'awaiting_approval',
  });

  const statusMutation = useMutation({
    mutationFn: (status: ApplicationStatus) => applicationsApi.patchStatus(id!, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application', id] });
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const noteMutation = useMutation({
    mutationFn: (body: string) => applicationsApi.addNote(id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application', id] });
      setNoteBody('');
      toast.success('Note added');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => applicationsApi.deleteNote(id!, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['application', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => applicationsApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Application deleted');
      navigate('/applications');
    },
  });


  if(isLoading){
    return(
      <div>
        <Header title="Application" />
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if(!app){
    return(
      <div className="p-6">
        <p className="text-muted-foreground">Application not found.</p>
        <Button variant="link" onClick={() => navigate('/applications')}>← Back to Applications</Button>
      </div>
    );
  }

  return(
    <div>
      <Header
        title={app.job_title}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/applications"><ArrowLeft className="mr-1 h-4 w-4" />Back</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-1 h-4 w-4" />Delete
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Hero card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{app.job_title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {app.company_name && (
                    <Link to={`/companies/${app.company_id}`} className="hover:text-foreground hover:underline">
                      {app.company_name}
                    </Link>
                  )}
                  {app.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />{app.location}
                    </span>
                  )}
                  {app.remote && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Wifi className="h-3.5 w-3.5" />Remote
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={app.status} onValueChange={(v: ApplicationStatus) => statusMutation.mutate(v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <StatusBadge status={app.status} />
              </div>
            </div>

            <Separator className="my-4" />

            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="font-medium text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />Salary
                </dt>
                <dd>{formatSalary(app.salary_min, app.salary_max)}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />Applied
                </dt>
                <dd>{formatDate(app.date_applied)}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Saved</dt>
                <dd>{formatDate(app.date_saved)}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Source</dt>
                <dd className="capitalize">{app.source}</dd>
              </div>
            </dl>

            {app.url && (
              <div className="mt-4">
                <Button asChild variant="outline" size="sm">
                  <a href={app.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />View Job Posting
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Draft ready — direct user to email for approval action */}
        {app.status === 'awaiting_approval' && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Draft Ready for Review</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Check your email for the approval link. Click <strong>Approve &amp; Submit</strong> to queue
                  the application, or <strong>Request Changes</strong> to open the review page with your feedback token.
                </AlertDescription>
              </Alert>

              {/* Read-only draft preview */}
              {(() => {
                const cl = (drafts as { coverLetter: CoverLetter | null } | undefined)?.coverLetter;
                const rd = (drafts as { resumeDraft: ResumeDraft | null } | undefined)?.resumeDraft;
                if(!cl && !rd) return null;
                return(
                  <Tabs defaultValue="cover-letter">
                    <TabsList>
                      {cl && <TabsTrigger value="cover-letter"><FileText className="mr-1.5 h-3.5 w-3.5" />Cover Letter</TabsTrigger>}
                      {rd && <TabsTrigger value="resume"><FileCode className="mr-1.5 h-3.5 w-3.5" />Resume (LaTeX)</TabsTrigger>}
                    </TabsList>
                    {cl && (
                      <TabsContent value="cover-letter">
                        <pre className="mt-2 max-h-72 overflow-y-auto rounded-lg border bg-muted/30 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
                          {cl.content}
                        </pre>
                      </TabsContent>
                    )}
                    {rd && (
                      <TabsContent value="resume">
                        <pre className="mt-2 max-h-72 overflow-y-auto rounded-lg border bg-muted/30 p-4 font-mono text-xs leading-relaxed">
                          {rd.latex_source}
                        </pre>
                      </TabsContent>
                    )}
                  </Tabs>
                );
              })()}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="notes">
          <TabsList>
            <TabsTrigger value="notes">Notes ({app.notes?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="contacts">Contacts ({app.contacts?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="reminders">Reminders ({app.reminders?.length ?? 0})</TabsTrigger>
            {app.job_description && <TabsTrigger value="jd">Job Description</TabsTrigger>}
          </TabsList>

          <TabsContent value="notes" className="space-y-3">
            {app.notes?.map(note => (
              <div key={note.id} className="flex items-start gap-3 rounded-lg border bg-white p-3">
                <div className="flex-1 text-sm whitespace-pre-wrap">{note.body}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                  {formatDate(note.created_at)}
                  <button
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    className="text-destructive hover:opacity-80"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Textarea
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
                placeholder="Add a note…"
                rows={2}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => noteBody.trim() && noteMutation.mutate(noteBody)}
                disabled={!noteBody.trim() || noteMutation.isPending}
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="contacts">
            {!app.contacts?.length ? (
              <p className="text-sm text-muted-foreground py-4">No contacts added yet.</p>
            ) : (
              <ul className="space-y-2">
                {app.contacts.map(c => (
                  <li key={c.id} className="rounded-lg border bg-white p-3 text-sm">
                    <p className="font-medium">{c.name}</p>
                    {c.title && <p className="text-muted-foreground">{c.title}</p>}
                    {c.email && <p className="text-blue-600">{c.email}</p>}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="reminders">
            {!app.reminders?.length ? (
              <p className="text-sm text-muted-foreground py-4">No reminders set.</p>
            ) : (
              <ul className="space-y-2">
                {app.reminders.map(r => (
                  <li key={r.id} className={`rounded-lg border bg-white p-3 text-sm ${r.completed ? 'opacity-50' : ''}`}>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-muted-foreground">{formatDate(r.due_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {app.job_description && (
            <TabsContent value="jd">
              <pre className="whitespace-pre-wrap rounded-lg border bg-white p-4 text-sm font-sans leading-relaxed">
                {app.job_description}
              </pre>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
