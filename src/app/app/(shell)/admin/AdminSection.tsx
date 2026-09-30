import { Card } from "@/components/ui/Card";

export function AdminSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5" elevated>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
