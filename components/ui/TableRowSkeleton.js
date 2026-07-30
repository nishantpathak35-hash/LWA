import React from 'react';
import { TableRow, TableCell } from './core';

export default function TableRowSkeleton({ rows = 6, cols = 8 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <TableRow key={rIdx} className="animate-pulse">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <TableCell key={cIdx}>
              <div className="h-4 bg-muted/60 rounded w-full max-w-[120px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
