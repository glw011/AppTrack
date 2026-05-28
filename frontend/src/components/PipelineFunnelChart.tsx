import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { StatsResponse } from '@/types';

const CHART_STATUSES = [
  { key: 'saved', label: 'Saved', color: '#94a3b8' },
  { key: 'discovered', label: 'Discovered', color: '#38bdf8' },
  { key: 'applied', label: 'Applied', color: '#3b82f6' },
  { key: 'interviewing', label: 'Interviewing',color: '#8b5cf6' },
  { key: 'awaiting_approval', label: 'Approval', color: '#6366f1' },
  { key: 'offer', label: 'Offer', color: '#10b981' },
  { key: 'rejected', label: 'Rejected', color: '#ef4444' },
];

interface Props { stats: StatsResponse }

export default function PipelineFunnelChart({ stats }: Props) {
  const data = CHART_STATUSES.map(s => ({
    name: s.label,
    count: stats[s.key as keyof StatsResponse] ?? 0,
    color: s.color,
  })).filter(d => d.count > 0);

  if(data.length === 0){
    return(
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No applications yet
      </div>
    );
  }

  return(
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: 'hsl(210 40% 96%)' }}
          contentStyle={{ fontSize: 12, borderRadius: 6 }}
          formatter={(v: number) => [v, 'Applications']}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
