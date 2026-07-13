'use client';

import { startTransition, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Check if running on mobile or as PWA (standalone)
    const isMobile = window.innerWidth <= 768;
    const standaloneNavigator = window.navigator as Navigator & { standalone?: boolean };
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || standaloneNavigator.standalone === true;

    // We only want to show the splash screen on mobile/PWA environments on initial load
    if ((isMobile || isPWA) && !sessionStorage.getItem('splashShown')) {
      startTransition(() => setShowSplash(true));
      
      // Hide splash after 2 seconds
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('splashShown', 'true');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            {/* Minimal App Icon */}
            <div className="bg-blue-600 p-5 rounded-3xl shadow-sm mb-5">
              <ShoppingBag className="w-12 h-12 text-white" strokeWidth={2.5} />
            </div>
            
            {/* Clean Typography */}
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              OwnShop
            </h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
