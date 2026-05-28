import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Zap, CheckCircle, XCircle } from 'lucide-react';
import DraftReviewCard from '@/components/DraftReviewCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { pipelineApi } from '@/api/pipeline';
import type { CoverLetter, ResumeDraft } from '@/types';

export default function Review() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { data: drafts, isLoading, error } = useQuery({
    queryKey: ['review-data', applicationId, token],
    queryFn: () => pipelineApi.getReviewData(applicationId!, token!),
    enabled: !!applicationId && !!token,
  });

  const rejectMutation = useMutation({
    mutationFn: (feedback: string) => pipelineApi.submitRejectFeedback(token!, feedback),
    onSuccess: () => toast.success('Feedback submitted — the Draft Agent will revise and send a new draft'),
    onError: () => toast.error('Failed to submit feedback — the link may have expired'),
  });

  if(!token){
    return(
      <ReviewShell>
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>Invalid review link — no token found.</AlertDescription>
        </Alert>
      </ReviewShell>
    );
  }

  if(rejectMutation.isSuccess) {
    return(
      <ReviewShell>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <h2 className="text-lg font-semibold">Feedback Received</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your feedback has been sent to the Draft Agent. You'll receive a new email when the revised drafts are ready.
            </p>
          </CardContent>
        </Card>
      </ReviewShell>
    );
  }

  return(
    <ReviewShell>
      <Card>
        <CardHeader>
          <CardTitle>Review Your Application</CardTitle>
          <CardDescription>
            Approve to submit automatically, or request changes with feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>Failed to load draft — the link may have expired.</AlertDescription>
            </Alert>
          ) : (
            <DraftReviewCard
              coverLetter={(drafts as { coverLetter: CoverLetter | null } | undefined)?.coverLetter ?? null}
              resumeDraft={(drafts as { resumeDraft: ResumeDraft | null } | undefined)?.resumeDraft ?? null}
              onApprove={() => {
                // Approve redirect happens server-side; show info
                toast.info('Use the approve link in your email to approve and submit in one click.');
              }}
              onReject={feedback => rejectMutation.mutate(feedback)}
              loading={rejectMutation.isPending}
            />
          )}
        </CardContent>
      </Card>
    </ReviewShell>
  );
}

function ReviewShell({ children }: { children: React.ReactNode }) {
  return(
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">AppTrack</span>
        </div>
        {children}
      </div>
    </div>
  );
}
