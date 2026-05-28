import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle, Clock, TrendingUp, Plus, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/layout/Header';
import PipelineFunnelChart from '@/components/PipelineFunnelChart';
import StatusBadge from '@/components/StatusBadge';
import { applicationsApi } from '@/api/applications';
import { remindersApi } from '@/api/reminders';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

export default function Dashboard() {
  const user = useAuthStore(s => s.user);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: applicationsApi.stats,
  });

  const { data: recentApps, isLoading: appsLoading } = useQuery({
    queryKey: ['applications', { limit: 5 }],
    queryFn: () => applicationsApi.list({ limit: 5, sort: 'created_at' }),
  });

  const { data: reminders } = useQuery({
    queryKey: ['reminders', { completed: false }],
    queryFn: () => remindersApi.list({ completed: false }),
  });

  const pendingApprovals = stats ? (stats.awaiting_approval ?? 0) : 0;

  return(
    <div>
      <Header
        title={`Good morning, ${user?.name?.split(' ')[0] ?? 'there'}`}
        action={
          <Button asChild size="sm">
            <Link to="/applications/new">
              <Plus className="mr-1.5 h-4 w-4" />New Application
            </Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Pending approval banner */}
        {pendingApprovals > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-800">
              <AlertCircle className="h-4 w-4" />
              {pendingApprovals} application{pendingApprovals > 1 ? 's' : ''} awaiting your approval
            </div>
            <Button asChild size="sm" variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-100">
              <Link to="/applications?status=awaiting_approval">Review</Link>
            </Button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Applications"
            value={stats?.total ?? 0}
            icon={Briefcase}
            loading={statsLoading}
          />
          <StatCard
            label="Active"
            value={(stats?.applied ?? 0) + (stats?.interviewing ?? 0)}
            icon={TrendingUp}
            loading={statsLoading}
          />
          <StatCard
            label="Interviews"
            value={stats?.interviewing ?? 0}
            icon={Clock}
            loading={statsLoading}
          />
          <StatCard
            label="Offers"
            value={stats?.offer ?? 0}
            icon={CheckCircle}
            loading={statsLoading}
            highlight
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Funnel chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Status Distribution</CardTitle>
              <CardDescription>Applications by current status</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : stats ? (
                <PipelineFunnelChart stats={stats} />
              ) : null}
            </CardContent>
          </Card>

          {/* Upcoming reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Upcoming Reminders</CardTitle>
              <CardDescription>Next tasks to action</CardDescription>
            </CardHeader>
            <CardContent>
              {!reminders?.data?.length ? (
                <p className="text-sm text-muted-foreground">No upcoming reminders</p>
              ) : (
                <ul className="space-y-2">
                  {reminders.data.slice(0, 4).map(r => (
                    <li key={r.id} className="flex items-start gap-2 text-sm">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium leading-tight">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(r.due_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {(reminders?.data?.length ?? 0) > 4 && (
                <Button asChild variant="link" size="sm" className="mt-2 h-auto p-0 text-xs">
                  <Link to="/reminders">View all →</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent applications */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Applications</CardTitle>
              <CardDescription>Your 5 most recently added</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/applications">View all →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {appsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !recentApps?.data?.length ? (
              <p className="text-sm text-muted-foreground">
                No applications yet.{' '}
                <Link to="/applications/new" className="text-primary hover:underline">Add your first one</Link>.
              </p>
            ) : (
              <ul className="divide-y">
                {recentApps.data.map(app => (
                  <li key={app.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <Link to={`/applications/${app.id}`} className="text-sm font-medium hover:underline">
                        {app.job_title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{app.company_name ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={app.status} />
                      <span className="text-xs text-muted-foreground">{formatDate(app.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, loading, highlight,
}: { label: string; value: number; icon: React.ElementType; loading?: boolean; highlight?: boolean }) {
  return(
    <Card className={highlight && value > 0 ? 'border-green-200 bg-green-50' : ''}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="text-xs font-medium">{label}</CardDescription>
        <Icon className={`h-4 w-4 ${highlight && value > 0 ? 'text-green-600' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <span className={`text-2xl font-bold ${highlight && value > 0 ? 'text-green-700' : ''}`}>
            {value}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
