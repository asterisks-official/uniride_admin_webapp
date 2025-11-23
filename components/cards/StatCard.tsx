'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down';
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  loading = false,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState<number | string>(value);
  const prevValueRef = useRef<number | string>(value);
  const colorStyles = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      trend: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      trend: 'text-green-600',
    },
    yellow: {
      bg: 'bg-yellow-50',
      icon: 'text-yellow-600',
      trend: 'text-yellow-600',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      trend: 'text-red-600',
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      trend: 'text-purple-600',
    },
    gray: {
      bg: 'bg-gray-50',
      icon: 'text-gray-600',
      trend: 'text-gray-600',
    },
  };

  const styles = colorStyles[color];

  useEffect(() => {
    const isNumber = typeof value === 'number' && typeof prevValueRef.current === 'number';
    if (!isNumber) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }
    const start = prevValueRef.current as number;
    const end = value as number;
    const duration = 800;
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(start + (end - start) * eased);
      setDisplayValue(current);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    prevValueRef.current = value;
    return () => cancelAnimationFrame(raf);
  }, [value]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
          <div className={`w-12 h-12 ${styles.bg} rounded-lg`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{displayValue}</p>
          
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.direction === 'up' ? (
                <ArrowUpIcon className={`w-4 h-4 ${styles.trend}`} />
              ) : (
                <ArrowDownIcon className={`w-4 h-4 ${styles.trend}`} />
              )}
              <span className={`text-sm font-medium ${styles.trend}`}>
                {trend.value}%
              </span>
              <span className="text-sm text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={`w-12 h-12 ${styles.bg} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${styles.icon}`} />
          </div>
        )}
      </div>
    </div>
  );
}
