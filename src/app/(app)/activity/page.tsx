'use client';

import { useState, useEffect } from 'react';
import { Activity, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

type ActivityEntry = {
  id: string;
  action: string;
  createdAt: string;
  userId: string;
};

export default function ActivityLog() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/activity')
      .then(res => res.json())
      .then((data: unknown) => {
        setActivities(Array.isArray(data) ? data.filter(isActivityEntry) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600" />
          Activity Log
        </h2>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="flex py-12 items-center justify-center text-gray-500">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="flex py-12 items-center justify-center text-gray-500">No activities found</div>
        ) : (
          <div className="space-y-8">
            {activities.map((activity, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: idx * 0.05 }}
                key={activity.id} 
                className="flex items-start"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.action.replace(/_/g, ' ')}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {new Date(activity.createdAt).toLocaleString()}
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">User: {activity.userId}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function isActivityEntry(value: unknown): value is ActivityEntry {
  return typeof value === 'object' && value !== null &&
    typeof (value as ActivityEntry).id === 'string' &&
    typeof (value as ActivityEntry).action === 'string' &&
    typeof (value as ActivityEntry).createdAt === 'string' &&
    typeof (value as ActivityEntry).userId === 'string';
}
