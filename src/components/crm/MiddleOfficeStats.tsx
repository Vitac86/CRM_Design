import { Card } from '../ui';

type MiddleOfficeStatsProps = {
  stats: Array<{
    label: string;
    value: number;
  }>;
};

export const MiddleOfficeStats = ({ stats }: MiddleOfficeStatsProps) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{stat.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p>
        </Card>
      ))}
    </div>
  );
};
