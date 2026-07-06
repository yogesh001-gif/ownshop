'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Menu,
  X,
  Truck,
  ShoppingCart,
  Package,
  BarChart3,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const mainNav = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bill', href: '/billing', icon: FileText },
  { name: 'Customers', href: '/customers', icon: Users },
];

const allNav = [
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
  { name: 'Wholesale', href: '/wholesale', icon: Package },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Activity Log', href: '/activity', icon: Activity },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Fixed Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-lg border-t border-gray-200/50 shadow-[0_-4px_25px_-5px_rgba(0,0,0,0.1)] rounded-t-3xl z-40 pb-safe">
        <div className="flex items-center justify-around h-16 px-4">
          {mainNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform"
              >
                <item.icon className={`h-6 w-6 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
          
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform"
          >
            <Menu className="h-6 w-6 text-gray-500" />
            <span className="text-[10px] font-medium text-gray-500">Menu</span>
          </button>
        </div>
      </div>

      {/* Slide-out Full Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] md:hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">More Options</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 active:scale-95"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2 pb-8">
                {allNav.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center space-x-4 p-4 rounded-2xl active:bg-gray-100 transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <item.icon className={`h-6 w-6 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="font-semibold">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
