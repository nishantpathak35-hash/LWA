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
  showDivider = true
}) {
  const [logoFailed, setLogoFailed] = useState(false);

  const logoSizes = {
    sm: { box: 'h-8 w-8', px: 32 },
    md: { box: 'h-10 w-10', px: 40 },
    lg: { box: 'h-14 w-14', px: 56 },
    xl: { box: 'h-16 w-16', px: 64 },
    xxl: { box: 'h-20 w-20', px: 80 }
  };
  const logoSize = logoSizes[size] || logoSizes.md;

  return (
    <div className={cn('flex items-center gap-2.5 min-w-0 select-none', className)}>
      {/* Logo */}
      <div className={cn('relative flex items-center justify-center shrink-0 overflow-hidden rounded-lg bg-sidebar border border-border', logoSize.box, logoClassName)}>
        {logoFailed ? (
          <span className="font-semibold text-xs text-primary font-display">LA</span>
        ) : (
          <Image
            src="/api/brand-logo"
            alt="Luxeworx Atelier Logo"
            width={logoSize.px}
            height={logoSize.px}
            unoptimized
            className="h-full w-full object-contain scale-110"
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>

      {/* Divider */}
      {showDivider && (
        <div className="h-6 w-px bg-border shrink-0" />
      )}

      {/* Brand Title & Subtitle */}
      <div className="min-w-0 flex flex-col justify-center">
        <div className={cn(
          'font-display font-semibold text-sm tracking-wide text-primary whitespace-nowrap',
          titleClassName
        )}>
          {title || 'LWA PTS'}
        </div>
        {subtitle && (
          <div className={cn(
            'text-[9px] uppercase tracking-[0.15em] font-medium text-muted-foreground mt-0.5 whitespace-nowrap',
            subtitleClassName
          )}>
            {subtitle || 'LUXEWORX ATELIER'}
          </div>
        )}
      </div>
    </div>
  );
}
