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
    sm: { box: 'h-10 w-10', px: 40 },
    md: { box: 'h-13 w-13', px: 52 },
    lg: { box: 'h-16 w-16', px: 64 },
    xl: { box: 'h-20 w-20', px: 80 },
    xxl: { box: 'h-28 w-28', px: 112 }
  };
  const logoSize = logoSizes[size] || logoSizes.md;

  return (
    <div className={cn('flex items-center gap-2.5 min-w-0 select-none', className)}>
      {/* 3D Embossed Gold Logo Box */}
      <div className={cn('relative flex items-center justify-center shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-black border-2 border-[#e5c158]/80 shadow-[0_0_10px_rgba(212,175,55,0.3)] p-0.5', logoSize.box, logoClassName)}>
        {logoFailed ? (
          <span className="font-black tracking-wider text-sm text-[#e5c158] font-serif">LA</span>
        ) : (
          <Image
            src="/api/brand-logo"
            alt="Luxeworx Atelier Logo"
            width={logoSize.px}
            height={logoSize.px}
            unoptimized
            className="h-full w-full object-contain scale-[1.45] brightness-110 contrast-125 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]"
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>

      {/* Vertical Gold Divider */}
      {showDivider && (
        <div className="h-7 w-[1px] bg-gradient-to-b from-transparent via-[#d4af37]/60 to-transparent shrink-0" />
      )}

      {/* Brand Title & Subtitle */}
      <div className="min-w-0 flex flex-col justify-center">
        <div className={cn(
          'font-serif font-bold text-base tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#ca8a04] whitespace-nowrap drop-shadow-xs',
          titleClassName
        )}>
          {title || 'LWA PTS'}
        </div>
        {subtitle && (
          <div className={cn(
            'text-[8.5px] uppercase tracking-[0.18em] font-semibold text-slate-300/90 mt-0.5 whitespace-nowrap',
            subtitleClassName
          )}>
            {subtitle || 'LUXEWORX ATELIER'}
          </div>
        )}
      </div>
    </div>
  );
}

