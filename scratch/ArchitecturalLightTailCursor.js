'use client';

import React, { useEffect, useRef } from 'react';

export default function ArchitecturalLightTailCursor() {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Only activate on desktop/laptop devices with fine pointer
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse state
    const mouse = {
      x: -100,
      y: -100,
      targetX: -100,
      targetY: -100,
      vx: 0,
      vy: 0,
      isHovered: false,
      isPressed: false,
      isVisible: false,
    };

    // Trail history points for smooth luminous ribbon
    const trail = [];
    const maxTrailLength = 22;

    // Particle pool for ambient architectural dust when moving
    const particles = [];
    const maxParticles = 35;

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      if (!mouse.isVisible) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.isVisible = true;
      }

      // Check if hovering interactive element
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
      mouse.isHovered = !!interactive;

      // Spawn subtle ambient light particle on swift movement
      const dist = Math.hypot(mouse.targetX - mouse.x, mouse.targetY - mouse.y);
      if (dist > 4 && particles.length < maxParticles) {
        particles.push({
          x: e.clientX + (Math.random() - 0.5) * 6,
          y: e.clientY + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          size: Math.random() * 2.2 + 1,
          alpha: 0.7,
          decay: Math.random() * 0.03 + 0.02,
        });
      }
    };

    const handleMouseDown = () => { mouse.isPressed = true; };
    const handleMouseUp = () => { mouse.isPressed = false; };
    const handleMouseLeave = () => { mouse.isVisible = false; };
    const handleMouseEnter = () => { mouse.isVisible = true; };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    let animId;
    let ringRadius = 4;
    let targetRingRadius = 4;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (mouse.isVisible) {
        // High-speed smooth interpolation for cursor point
        const ease = 0.65;
        mouse.vx = (mouse.targetX - mouse.x) * ease;
        mouse.vy = (mouse.targetY - mouse.y) * ease;
        mouse.x += mouse.vx;
        mouse.y += mouse.vy;

        // Record history for ribbon tail
        trail.unshift({ x: mouse.x, y: mouse.y });
        if (trail.length > maxTrailLength) {
          trail.pop();
        }

        // 1. DRAW SMOOTH LUMINOUS TRAILING TAIL (RIBBON)
        if (trail.length > 2) {
          for (let i = 0; i < trail.length - 1; i++) {
            const p1 = trail[i];
            const p2 = trail[i + 1];
            const progress = 1 - i / trail.length; // 1 at tip, 0 at end

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);

            // Tapered line width and glowing fade
            const lineWidth = progress * (mouse.isHovered ? 5.5 : 3.5);
            ctx.lineWidth = Math.max(lineWidth, 0.5);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Luxury titanium white / platinum luminous gradient
            const alpha = progress * 0.45;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.stroke();

            // Subtle inner core
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineWidth = Math.max(lineWidth * 0.4, 0.5);
            ctx.strokeStyle = `rgba(255, 255, 255, ${progress * 0.85})`;
            ctx.stroke();
          }
        }

        // 2. DRAW FLOATING AMBIENT PARTICLES
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;

          if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.6})`;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // 3. DRAW MAGNETIC PRECISION LEAD DOT & EXPANDING RING
        targetRingRadius = mouse.isPressed ? 6 : mouse.isHovered ? 18 : 5;
        ringRadius += (targetRingRadius - ringRadius) * 0.25;

        // Outer Frosted Ring
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, ringRadius, 0, Math.PI * 2);
        if (mouse.isHovered) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = 1.2;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Center Pinpoint Core
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mouse.isHovered ? 2 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[99999] w-screen h-screen"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
}
