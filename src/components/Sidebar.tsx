'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  FileText, 
  ShoppingCart, 
  BarChart3, 
  Activity,
  LogOut,
  Package
} from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Billing', href: '/billing', icon: FileText },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
  { name: 'Wholesale', href: '/wholesale', icon: Package },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Activity Log', href: '/activity', icon: Activity },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200 w-64 shadow-sm">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          OwnShop
        </h1>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={classNames(
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                  'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200'
                )}
              >
                <item.icon
                  className={classNames(
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 h-5 w-5 shrink-0 transition-colors duration-200'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-gray-200 p-4">
        <SignOutButton>
          <button className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200">
            <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500" />
            Sign Out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
