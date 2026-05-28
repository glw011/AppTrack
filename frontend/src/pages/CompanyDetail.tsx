import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Globe, Building2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { companiesApi } from '@/api/companies';
import { applicationsApi } from '@/api/applications';
import { formatDate } from '@/lib/utils';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companiesApi.get(id!),
    enabled: !!id,
  });

  const { data: apps } = useQuery({
    queryKey: ['applications', { companyId: id }],
    queryFn: () => applicationsApi.list({ limit: 50 }),
    enabled: !!id,
    select: data => data.data.filter(a => a.company_id === id),
  });

  if(companyLoading){
    return(
      <div>
        <Header title="Company" />
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if(!company){
    return(
      <div className="p-6">
        <p className="text-muted-foreground">Company not found.</p>
        <Button variant="link" asChild><Link to="/companies">← Back</Link></Button>
      </div>
    );
  }

  return(
    <div>
      <Header
        title={company.name}
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/companies"><ArrowLeft className="mr-1 h-4 w-4" />Back</Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{company.name}</h2>
                {company.industry && <p className="text-sm text-muted-foreground">{company.industry}</p>}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />{company.website}
                  </a>
                )}
              </div>
            </div>
            {company.notes && (
              <p className="mt-4 text-sm text-muted-foreground">{company.notes}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Applications ({apps?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!apps?.length ? (
              <p className="text-sm text-muted-foreground">No applications for this company yet.</p>
            ) : (
              <ul className="divide-y">
                {apps.map(app => (
                  <li key={app.id} className="flex items-center justify-between py-2.5">
                    <Link to={`/applications/${app.id}`} className="text-sm font-medium hover:underline">
                      {app.job_title}
                    </Link>
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
