import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { UserButton } from '@clerk/nextjs';
import { Search, ShoppingBag } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full relative">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between bg-white/85 backdrop-blur-md px-4 md:px-6 shadow-sm z-30 md:static sticky top-2 mx-2 md:mx-0 md:top-0 rounded-2xl md:rounded-none border border-white/50 md:border-b md:border-gray-200/50">
          <div className="flex items-center flex-1">
            <div className="md:hidden flex items-center gap-2 mr-4">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 rounded-lg shadow-sm">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-gray-900">
                OwnShop
              </h1>
            </div>
            <div className="relative w-full max-w-md hidden md:block">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full rounded-full border-0 py-2 pl-10 pr-4 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-gray-50 hover:bg-gray-100 transition-colors"
                placeholder="Search anything (Press '/' to focus)"
              />
            </div>
          </div>
          <div className="flex items-center ml-4">
            <UserButton />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="mx-auto max-w-7xl min-h-full p-4 md:p-6 pb-32 md:pb-6">
            {children}
          </div>
        </main>
        
        <BottomNav />
      </div>
    </div>
  );
}
