export function HomeEntriesSkeleton() {
  return (
    <div className="px-6 md:px-10 lg:px-20 space-y-4">
      <div className="pt-1 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="h-10 w-36 bg-muted animate-pulse rounded-lg" />
        <div className="h-9 w-48 bg-muted animate-pulse rounded-xl" />
      </div>
      <div className="h-7 w-36 bg-muted animate-pulse rounded" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
      ))}
    </div>
  );
}