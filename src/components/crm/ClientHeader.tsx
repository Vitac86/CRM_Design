import { Badge } from '../ui';

type ClientHeaderProps = {
  name: string;
  clientType: string;
  clientCode: string;
  riskCategory: string;
};

export const ClientHeader = ({ name, clientType, clientCode, riskCategory }: ClientHeaderProps) => {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600">
        {name
          .split(' ')
          .slice(0, 2)
          .map((part) => part[0])
          .join('')}
      </div>

      <div className="flex min-w-[220px] flex-col gap-1">
        <h1 className="text-lg font-semibold text-slate-900">{name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Badge variant="info">{clientType}</Badge>
          <span>{clientCode}</span>
          <Badge variant="warning">{riskCategory}</Badge>
        </div>
      </div>
    </div>
  );
};
