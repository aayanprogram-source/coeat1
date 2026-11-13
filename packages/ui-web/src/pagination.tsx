import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export interface PaginationProps {
  page: number;
  hasNext: boolean;
  onPage: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
  pageLabel: string;
}

export function Pagination({ page, hasNext, onPage, previousLabel, nextLabel, pageLabel }: PaginationProps) {
  return (
    <nav aria-label={pageLabel} className="flex items-center justify-between gap-4 py-3">
      <Button variant="secondary" icon={<ChevronLeft className="h-4 w-4" aria-hidden />} disabled={page === 0} onClick={() => onPage(page - 1)}>
        {previousLabel}
      </Button>
      <span className="text-caption text-muted tabular-nums">{pageLabel}</span>
      <Button variant="secondary" disabled={!hasNext} onClick={() => onPage(page + 1)}>
        {nextLabel}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Button>
    </nav>
  );
}
