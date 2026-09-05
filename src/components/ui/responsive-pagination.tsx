import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ResponsivePaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function visiblePages(currentPage: number, totalPages: number) {
  const candidates = [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
  const pages = [...new Set(candidates.filter(page => page >= 1 && page <= totalPages))].sort((a, b) => a - b);
  return pages.flatMap((page, index) => {
    const previous = pages[index - 1];
    return previous && page - previous > 1 ? ['ellipsis', page] as const : [page] as const;
  });
}

export function ResponsivePagination({ currentPage, totalPages, onPageChange, className }: ResponsivePaginationProps) {
  if (totalPages <= 1) return null;
  const goTo = (page: number) => onPageChange(Math.min(totalPages, Math.max(1, page)));

  return (
    <nav aria-label="Pagination" className={cn('flex w-full items-center justify-between gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 px-2.5 sm:px-3"
        disabled={currentPage === 1}
        onClick={() => goTo(currentPage - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      <span className="text-xs font-semibold text-muted-foreground sm:hidden">
        Page {currentPage} of {totalPages}
      </span>

      <div className="hidden items-center gap-1 sm:flex">
        {visiblePages(currentPage, totalPages).map((page, index) => page === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="grid h-9 w-7 place-items-center text-muted-foreground">…</span>
        ) : (
          <Button
            key={page}
            type="button"
            variant={page === currentPage ? 'outline' : 'ghost'}
            size="icon"
            className="h-9 w-9"
            aria-current={page === currentPage ? 'page' : undefined}
            onClick={() => goTo(page)}
          >
            {page}
          </Button>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 px-2.5 sm:px-3"
        disabled={currentPage === totalPages}
        onClick={() => goTo(currentPage + 1)}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
