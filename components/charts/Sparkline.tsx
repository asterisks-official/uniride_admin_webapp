'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  colorClass?: string;
  fillClass?: string;
  animated?: boolean;
}

export function Sparkline({
  values,
  width = 240,
  height = 56,
  strokeWidth = 2,
  colorClass = 'stroke-blue-600',
  fillClass,
  animated = true,
}: SparklineProps) {
  const [length, setLength] = useState(0);
  const pathRef = useRef<SVGPathElement | null>(null);

  const points = useMemo(() => {
    if (!values || values.length === 0) return '';
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const stepX = width / (values.length - 1);
    const getY = (v: number) => height - ((v - min) / range) * height;
    return values
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${i * stepX},${getY(v)}`)
      .join(' ');
  }, [values, width, height]);

  useEffect(() => {
    if (!animated || !pathRef.current) return;
    const l = pathRef.current.getTotalLength();
    setLength(l);
  }, [points, animated]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {fillClass && (
        <path
          d={`${points} L ${width},${height} L 0,${height} Z`}
          className={fillClass}
          opacity={0.08}
        />
      )}
      <path
        ref={pathRef}
        d={points}
        className={colorClass}
        fill="none"
        strokeWidth={strokeWidth}
        style={
          animated && length
            ? { strokeDasharray: length, strokeDashoffset: length, animation: 'dash 1s ease forwards' }
            : undefined
        }
      />
      <style jsx>{`
        @keyframes dash { to { stroke-dashoffset: 0; } }
      `}</style>
    </svg>
  );
}