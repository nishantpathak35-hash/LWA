'use client';

import React, { useEffect, useState, useRef } from 'react';

export default function CustomCursor() {
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const cursorRef = useRef(null);
  const mousePos = useRef({ x: -100, y: -100 });
  const renderPos = useRef({ x: -100, y: -100 });
  const animFrameId = useRef(null);

  useEffect(() => {
    // Only active on desktop/laptop devices
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setMounted(true);
    } else {
      return;
    }

    const handleMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      const target = e.target;
      const interactive = target && (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('[role="button"]') ||
        target.closest('.cursor-pointer')
      );

      setIsHovered(!!interactive);
    };

    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    const render = () => {
      // 60fps silky smooth tracking
      const speed = 0.5;
      renderPos.current.x += (mousePos.current.x - renderPos.current.x) * speed;
      renderPos.current.y += (mousePos.current.y - renderPos.current.y) * speed;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${renderPos.current.x}px, ${renderPos.current.y}px, 0)`;
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isVisible]);

  if (!mounted) return null;

  return (
    <div
      ref={cursorRef}
      className={`pointer-events-none fixed top-0 left-0 z-[999999] will-change-transform transition-opacity duration-150 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {/* 
        COMPACT 18px INTERIOR ARCHITECT DRAFTING STYLUS & MEASUREMENT NIB
        Tip is strictly at (0, 0)
      */}
      <div
        className={`relative transition-transform duration-100 ease-out ${
          isPressed ? 'scale-90 rotate-[-8deg]' : isHovered ? 'scale-115' : 'scale-100'
        }`}
        style={{ transformOrigin: '0 0' }}
      >
        {/* Compact 18x18 SVG Architectural Drafting Nib */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
        >
          {/* Architectural Drafting Pen Blade */}
          <path
            d="M2 2L8.5 17.5L11 11L17.5 8.5L2 2Z"
            fill="#FFFFFF"
            stroke="#0A0D12"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Calibrated Center Slit Line */}
          <path
            d="M11 11L15 15"
            stroke="#0A0D12"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Interior Drafting Measurement Tick */}
          <circle cx="2" cy="2" r="1.2" fill={isHovered ? '#10B981' : '#FFFFFF'} />
        </svg>

        {/* Subtle Laser Datum Point at tip (0,0) */}
        <div
          className={`absolute -top-0.5 -left-0.5 rounded-full transition-all duration-150 ${
            isHovered
              ? 'w-2 h-2 bg-emerald-400 shadow-[0_0_8px_#34d399]'
              : 'w-1.5 h-1.5 bg-white shadow-[0_0_6px_#ffffff]'
          }`}
        />
      </div>
    </div>
  );
}
