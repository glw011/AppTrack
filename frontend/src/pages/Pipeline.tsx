import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Play, ToggleLeft, ToggleRight, Search, FileText, Send, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import PipelineRunLog from '@/components/PipelineRunLog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { pipelineApi } from '@/api/pipeline';

const COMPONENTS = [
  {
    key: 'search' as const,
    label: 'Search Agent',
    description: 'Discovers new job postings matching your search config',
    icon: Search,
  },
  {
    key: 'draft' as const,
    label: 'Draft Agent',
    description: 'Generates tailored cover letters and resumes for discovered jobs',
    icon: FileText,
  },
  {
    key: 'submission' as const,
    label: 'Submission Agent',
    description: 'Submits approved applications to employers',
    icon: Send,
  },
];

export default function Pipeline() {
  const qc = useQueryClient();

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['search-config'],
    queryFn: pipelineApi.getSearchConfig,
  });

  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ['pipeline-runs'],
    queryFn: () => pipelineApi.getRuns({ limit: 20 }),
    refetchInterval: 10_000,
  });

  const toggleMutation = useMutation({
    mutationFn: pipelineApi.toggleSearchConfig,
    onSuccess: cfg => {
      qc.invalidateQueries({ queryKey: ['search-config'] });
      toast.success(cfg.is_active ? 'Pipeline enabled' : 'Pipeline paused');
    },
    onError: () => toast.error('No search config found — configure one first'),
  });

  const triggerMutation = useMutation({
    mutationFn: pipelineApi.trigger,
    onSuccess: ({ component }) => {
      qc.invalidateQueries({ queryKey: ['pipeline-runs'] });
      toast.success(`${component} agent started`);
    },
    onError: (_, component) => toast.error(`Failed to trigger ${component} agent — check service is running`),
  });

  return(
    <div>
      <Header
        title="Pipeline"
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/pipeline/profile">
              <Settings className="mr-1.5 h-4 w-4" />Configure Profile
            </Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Pipeline toggle */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Automated Pipeline</CardTitle>
              <CardDescription>
                {configLoading
                  ? 'Loading…'
                  : !config
                  ? 'No search config found. Configure one to enable the pipeline.'
                  : config.is_active
                  ? 'Active — agents run on their scheduled cron'
                  : 'Paused — agents will not run automatically'
                }
              </CardDescription>
            </div>
            {configLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending || !config}
                className={config?.is_active ? 'border-green-300 text-green-700 hover:bg-green-50' : ''}
              >
                {config?.is_active
                  ? <><ToggleRight className="mr-1.5 h-4 w-4" />Active</>
                  : <><ToggleLeft className="mr-1.5 h-4 w-4" />Paused</>
                }
              </Button>
            )}
          </CardHeader>
        </Card>

        {/* Manual trigger cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {COMPONENTS.map(({ key, label, description, icon: Icon }) => {
            const isRunning = runs?.some(r => r.component === key && r.status === 'running');
            return(
              <Card key={key}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4" />{label}
                  </CardTitle>
                  <CardDescription className="text-xs">{description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => triggerMutation.mutate(key)}
                    disabled={triggerMutation.isPending || !!isRunning}
                  >
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    {isRunning ? 'Running…' : 'Run Now'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Run history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Run History</CardTitle>
            <CardDescription>Recent pipeline component runs</CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineRunLog runs={runs ?? []} loading={runsLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
