'use client';

import Link from 'next/link';
import { 
  UserCircleIcon, 
  ShieldCheckIcon,
  StarIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

interface UserCardProps {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'rider' | 'passenger' | 'both';
  isRiderVerified: boolean;
  trustScore: number;
  averageRating?: number;
  totalRides: number;
}

export function UserCard({
  uid,
  displayName,
  email,
  photoURL,
  role,
  isRiderVerified,
  trustScore,
  averageRating,
  totalRides,
}: UserCardProps) {
  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'rider':
        return 'bg-purple-100 text-purple-800';
      case 'passenger':
        return 'bg-blue-100 text-blue-800';
      case 'both':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Link href={`/users/${uid}`}>
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                <UserCircleIcon className="w-10 h-10 text-gray-400" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {displayName}
              </h3>
              {isRiderVerified && (
                <CheckBadgeIcon className="w-5 h-5 text-blue-600" title="Verified Rider" />
              )}
            </div>
            
            <p className="text-sm text-gray-600 truncate mb-3">{email}</p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <ShieldCheckIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">Trust Score</span>
                </div>
                <span className={`text-sm font-semibold px-2 py-1 rounded ${getTrustScoreColor(trustScore)}`}>
                  {trustScore}
                </span>
              </div>

              {averageRating !== undefined && (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <StarIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Rating</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {averageRating.toFixed(1)} ⭐
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs text-gray-500">Rides</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {totalRides}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
