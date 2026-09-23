import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { TableHead } from './core';
import { cn } from '../../app/lib/utils';

export default function SortableHeader({
  field,
  label,
  currentSortField,
  currentSortDir,
  onSort,
  align = 'left',
  className = '',
  children
}) {
  const isActive = currentSortField === field;

  return (
    <TableHead className={cn("select-none py-3 px-3 whitespace-nowrap", align === 'right' && "text-right", align === 'center' && "text-center", className)}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 font-semibold text-xs tracking-wider transition-colors whitespace-nowrap",
          align === 'right' && "ml-auto flex-row-reverse",
          align === 'center' && "mx-auto justify-center",
          isActive 
            ? "text-amber-600 dark:text-primary font-bold" 
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        )}
        title={`Sort by ${label || field}`}
      >
        <span className="whitespace-nowrap">{children || label}</span>
        {isActive ? (
          currentSortDir === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-amber-600 dark:text-primary flex-shrink-0" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-amber-600 dark:text-primary flex-shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100 flex-shrink-0" />
        )}
      </button>
    </TableHead>
  );
}
