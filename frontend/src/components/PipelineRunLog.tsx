import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { PipelineRun } from '@/types';

const STATUS_ICON: Record<PipelineRun['status'], React.ReactNode> = {
  running: <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  partial: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
};

const COMPONENT_LABEL: Record<string, string> = {
  search: 'Search', draft: 'Draft', submission: 'Submission',
};

interface Props {
  runs: PipelineRun[];
  loading?: boolean;
}

export default function PipelineRunLog({ runs, loading }: Props) {
  if(loading){
    return(
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if(runs.length === 0){
    return(
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        No runs yet — trigger a component above to start
      </div>
    );
  }

  return(
    <div className="space-y-1">
      {runs.map(run => (
        <div
          key={run.id}
          className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm hover:bg-muted/50"
        >
          <div className="flex items-center gap-2.5">
            {STATUS_ICON[run.status]}
            <span className="font-medium">{COMPONENT_LABEL[run.component] ?? run.component}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{formatDate(run.started_at)}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {run.status !== 'running' && (
              <>
                <span>{run.items_succeeded}/{run.items_processed} ok</span>
                {run.items_failed > 0 && (
                  <span className="text-red-500">{run.items_failed} failed</span>
                )}
              </>
            )}
            {run.status === 'running' && <Clock className="h-3 w-3" />}
          </div>
        </div>
      ))}
    </div>
  );
}
