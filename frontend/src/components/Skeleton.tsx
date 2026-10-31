import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-stone-200/70 rounded-xl ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-[26px] p-6 border border-stone-200/80 shadow-soft space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="w-24 h-6 rounded-full" />
        <Skeleton className="w-16 h-5 rounded-full" />
      </div>
      <Skeleton className="w-40 h-7" />
      <div className="pt-4 border-t border-stone-100 flex justify-between items-center">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-32 h-6" />
      </div>
    </div>
  );
}
