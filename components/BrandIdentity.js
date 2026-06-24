'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '../app/lib/utils';

export default function BrandIdentity({
  title,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
  logoClassName,
  size = 'md',
  wrapTitle = false
}) {
  const [logoFailed, setLogoFailed] = useState(false);

  // Increased sizes slightly
  const logoSizes = {
    sm: { box: 'h-10 w-10', px: 40 },
    md: { box: 'h-14 w-14', px: 56 },
    lg: { box: 'h-16 w-16', px: 64 },
    xl: { box: 'h-20 w-20', px: 80 },
    xxl: { box: 'h-28 w-28', px: 112 }
  };
  const logoSize = logoSizes[size] || logoSizes.md;

  return (
    <div className={cn('flex items-center gap-3 min-w-0', className)}>
      <div className={cn('relative flex items-center justify-center shrink-0 overflow-hidden rounded-lg text-slate-950', logoSize.box, logoClassName)}>
        {logoFailed ? (
          <span className="font-semibold tracking-tight text-sm text-slate-100">LA</span>
        ) : (
          <Image
            src="/api/brand-logo"
            alt="Luxeworx Atelier Interior Private Limited logo"
            width={logoSize.px}
            height={logoSize.px}
            unoptimized
            className="h-full w-full object-contain"
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>
      <div className="min-w-0">
        <div className={cn(wrapTitle ? 'whitespace-normal break-words leading-tight' : 'truncate', 'font-semibold tracking-wider text-slate-100', titleClassName)}>
          {title}
        </div>
        {subtitle ? (
          <div className={cn(wrapTitle ? 'whitespace-normal break-words leading-tight mt-0.5' : 'truncate', 'text-[10px] uppercase tracking-[0.22em] text-slate-500', subtitleClassName)}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
