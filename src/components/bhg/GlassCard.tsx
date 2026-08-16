import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn("glass animate-rise rounded-3xl p-4", className)}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="tamil flex items-center gap-2 text-base font-semibold">
          <span aria-hidden>{icon}</span>
          <span className="truncate">{title}</span>
        </h2>
        {subtitle ? (
          <p className="tamil mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
