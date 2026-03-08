"use client"

export function JobCardSkeleton() {
  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 sm:p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="h-5 bg-white/[0.08] rounded w-3/4 mb-2" />
          <div className="h-4 bg-white/[0.05] rounded w-1/2" />
        </div>
        <div className="h-3 bg-white/[0.05] rounded w-12 ml-3" />
      </div>

      {/* Badges */}
      <div className="flex gap-2 mb-4">
        <div className="h-6 bg-white/[0.05] rounded w-24" />
        <div className="h-6 bg-white/[0.05] rounded w-16" />
        <div className="h-6 bg-white/[0.05] rounded w-20" />
      </div>

      {/* Salary */}
      <div className="h-4 bg-emerald-500/10 rounded w-32 mb-3" />

      {/* Requirements */}
      <div className="space-y-1 mb-4">
        <div className="h-3 bg-white/[0.04] rounded w-full" />
        <div className="h-3 bg-white/[0.04] rounded w-4/5" />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
        <div className="flex-1 h-10 bg-white/[0.05] rounded-lg" />
        <div className="flex-1 h-10 bg-white/[0.05] rounded-lg" />
        <div className="h-10 w-10 bg-white/[0.05] rounded-lg" />
      </div>
    </div>
  )
}

export function JobListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  )
}
