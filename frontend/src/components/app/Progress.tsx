export default function Progress({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress"
        className="h-2 flex-1 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right font-mono text-xs text-muted">{value}%</span>
    </div>
  );
}
