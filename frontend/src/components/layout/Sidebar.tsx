import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Building2, Users, FileText,
  Bell, Zap, UserCircle, LogOut, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Separator } from '@/components/ui/separator';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/applications', icon: Briefcase, label: 'Applications' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/resumes', icon: FileText, label: 'Resumes' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
];

const PIPELINE_ITEMS = [
  { to: '/pipeline', icon: Zap, label: 'Pipeline' },
  { to: '/pipeline/profile', icon: UserCircle, label: 'My Profile' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return(
    <aside className="flex h-full w-60 flex-col bg-primary text-primary-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4">
        <Zap className="h-5 w-5 text-blue-400" />
        <span className="text-lg font-semibold tracking-tight">AppTrack</span>
      </div>

      <Separator className="bg-primary-foreground/10" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="my-2 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-foreground/40">
            Pipeline
          </p>
        </div>

        {PIPELINE_ITEMS.map(item => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <Separator className="bg-primary-foreground/10" />

      {/* User / logout */}
      <div className="p-3">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{user?.name ?? 'User'}</p>
            <p className="truncate text-xs text-primary-foreground/50">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-primary-foreground/50 hover:text-primary-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return(
    <NavLink
      to={to}
      end={to === '/pipeline'}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary-foreground/15 text-primary-foreground'
            : 'text-primary-foreground/65 hover:bg-primary-foreground/10 hover:text-primary-foreground',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
      <ChevronRight className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </NavLink>
  );
}
