import { Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  action?: React.ReactNode;
}

export default function Header({ title, action }: HeaderProps) {
  const navigate = useNavigate();

  return(
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-2">
        {action}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/reminders')}
          title="Reminders"
        >
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
