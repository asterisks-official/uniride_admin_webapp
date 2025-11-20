'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  UsersIcon, 
  TruckIcon, 
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  StarIcon,
  FlagIcon,
  BellIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'Rides', href: '/rides', icon: TruckIcon },
  { name: 'Requests', href: '/requests', icon: ClipboardDocumentListIcon },
  { name: 'Verifications', href: '/verifications', icon: CheckBadgeIcon },
  { name: 'Trust Scores', href: '/trust', icon: ShieldCheckIcon },
  { name: 'Ratings', href: '/ratings', icon: StarIcon },
  { name: 'Reports', href: '/reports', icon: FlagIcon },
  { name: 'Notifications', href: '/notifications', icon: BellIcon },
  { name: 'Config', href: '/config', icon: Cog6ToothIcon },
  { name: 'Audit Log', href: '/audit', icon: DocumentTextIcon },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full bg-gray-900 text-white w-64">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-gray-800">
        <h1 className="text-xl font-bold">UniRide Admin</h1>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${isActive 
                      ? 'bg-gray-800 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 p-4">
        <p className="text-xs text-gray-400 text-center">
          UniRide Admin v1.0
        </p>
      </div>
    </nav>
  );
}
