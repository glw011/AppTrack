import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@/types';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  // Manual statuses
  saved: { label: 'Saved', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  applied: { label: 'Applied', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  interviewing: { label: 'Interviewing', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  offer: { label: 'Offer', className: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  withdrawn: { label: 'Withdrawn', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  // Pipeline statuses
  discovered: { label: 'Discovered', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  pending_draft: { label: 'Pending Draft', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  drafting: { label: 'Drafting', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  awaiting_approval: { label: 'Awaiting Approval', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  revision_requested: { label: 'Revision Requested', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  approved: { label: 'Approved', className: 'bg-teal-50 text-teal-700 border-teal-200' },
  awaiting_submission: { label: 'Awaiting Submission', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  submitting: { label: 'Submitting', className: 'bg-blue-50 text-blue-600 border-blue-200' },
  submitted: { label: 'Submitted', className: 'bg-green-50 text-green-700 border-green-200' },
};

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-700 border-slate-200' };
  return(
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
