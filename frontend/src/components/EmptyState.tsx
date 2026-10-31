import React from 'react';
import { Inbox, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export default function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  return (
    <div className="py-12 px-4 rounded-3xl bg-white border border-dashed border-stone-200 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-cream-100 text-stone-400 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-forest-900">{title}</h4>
      <p className="text-xs text-stone-500 max-w-sm mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
