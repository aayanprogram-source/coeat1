'use client';

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { Skeleton } from './skeleton';

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  loading?: boolean;
  empty: ReactNode;
  caption: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, rows, loading = false, empty, caption, onRowClick }: DataTableProps<T>) {
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  if (!loading && rows.length === 0) return <>{empty}</>;

  return (
    <div className="overflow-x-auto rounded-card border border-line/70 bg-surface shadow-low">
      <table className="w-full border-collapse text-left text-body">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-background text-[12.5px] uppercase tracking-wide text-muted">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} scope="col" className="whitespace-nowrap px-5 py-3.5 font-semibold">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-t border-line">
                  <td colSpan={columns.length} className="px-4 py-3">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            : table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t border-line/70 transition duration-fast ${onRowClick ? 'cursor-pointer hover:bg-mint-100/70' : 'hover:bg-background'}`}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-4 align-middle tabular-nums">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
