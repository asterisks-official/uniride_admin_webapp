'use client';

interface TrustScoreChartProps {
  components: {
    rating: number;      // 0-30
    completion: number;  // 0-25
    reliability: number; // 0-25
    experience: number;  // 0-20
  };
  total: number; // 0-100
}

export function TrustScoreChart({ components, total }: TrustScoreChartProps) {
  const componentData = [
    {
      name: 'Rating',
      value: components.rating,
      max: 30,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100',
    },
    {
      name: 'Completion',
      value: components.completion,
      max: 25,
      color: 'bg-green-500',
      lightColor: 'bg-green-100',
    },
    {
      name: 'Reliability',
      value: components.reliability,
      max: 25,
      color: 'bg-yellow-500',
      lightColor: 'bg-yellow-100',
    },
    {
      name: 'Experience',
      value: components.experience,
      max: 20,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-100',
    },
  ];

  const getTrustCategory = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-600' };
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-600' };
    return { label: 'Poor', color: 'text-red-600' };
  };

  const category = getTrustCategory(total);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Trust Score Breakdown</h3>

      {/* Total Score */}
      <div className="mb-6 text-center">
        <div className="inline-flex flex-col items-center">
          <span className="text-5xl font-bold text-gray-900">{total}</span>
          <span className={`text-sm font-medium ${category.color} mt-1`}>
            {category.label}
          </span>
        </div>
      </div>

      {/* Component Bars */}
      <div className="space-y-4">
        {componentData.map((component) => {
          const percentage = (component.value / component.max) * 100;

          return (
            <div key={component.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">
                  {component.name}
                </span>
                <span className="text-sm text-gray-600">
                  {component.value} / {component.max}
                </span>
              </div>
              
              <div className="relative">
                {/* Background bar */}
                <div className={`w-full h-3 rounded-full ${component.lightColor}`}>
                  {/* Progress bar */}
                  <div
                    className={`h-3 rounded-full ${component.color} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Component Details</h4>
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
          <div>
            <span className="font-medium">Rating:</span> Based on average user ratings (max 30)
          </div>
          <div>
            <span className="font-medium">Completion:</span> Ride completion rate (max 25)
          </div>
          <div>
            <span className="font-medium">Reliability:</span> Cancellations & no-shows (max 25)
          </div>
          <div>
            <span className="font-medium">Experience:</span> Total rides completed (max 20)
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple distribution chart for dashboard
interface TrustDistributionProps {
  distribution: {
    excellent: number; // 80-100
    good: number;      // 60-79
    fair: number;      // 40-59
    poor: number;      // 0-39
  };
}

export function TrustDistributionChart({ distribution }: TrustDistributionProps) {
  const total = distribution.excellent + distribution.good + distribution.fair + distribution.poor;
  
  const categories = [
    { name: 'Excellent', value: distribution.excellent, color: 'bg-green-500' },
    { name: 'Good', value: distribution.good, color: 'bg-blue-500' },
    { name: 'Fair', value: distribution.fair, color: 'bg-yellow-500' },
    { name: 'Poor', value: distribution.poor, color: 'bg-red-500' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Trust Score Distribution</h3>

      {/* Stacked bar */}
      <div className="mb-6">
        <div className="flex h-8 rounded-lg overflow-hidden">
          {categories.map((category) => {
            const percentage = total > 0 ? (category.value / total) * 100 : 0;
            
            if (percentage === 0) return null;

            return (
              <div
                key={category.name}
                className={`${category.color} flex items-center justify-center text-white text-xs font-medium`}
                style={{ width: `${percentage}%` }}
                title={`${category.name}: ${category.value} users (${percentage.toFixed(1)}%)`}
              >
                {percentage > 10 && `${percentage.toFixed(0)}%`}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3">
        {categories.map((category) => {
          const percentage = total > 0 ? (category.value / total) * 100 : 0;

          return (
            <div key={category.name} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${category.color}`} />
              <span className="text-sm text-gray-700">
                {category.name}: <span className="font-medium">{category.value}</span>
                <span className="text-gray-500 ml-1">({percentage.toFixed(1)}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
