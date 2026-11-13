'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { colors } from '@datapal/ui-tokens';

export interface TrendPoint {
  label: string;
  value: number;
}

export interface TrendChartProps {
  data: TrendPoint[];
  ariaLabel: string;
  format?: (value: number) => string;
}

export function TrendChart({ data, ariaLabel, format = String }: TrendChartProps) {
  return (
    <div role="img" aria-label={ariaLabel} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={colors.line} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: colors.muted, fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: colors.muted, fontSize: 12 }} tickLine={false} axisLine={false} width={48} tickFormatter={format} />
          <Tooltip formatter={(v) => format(Number(v))} />
          <Line type="monotone" dataKey="value" stroke={colors.green700} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
