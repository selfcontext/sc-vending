import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Session, TransactionLog } from '@/types';
import AdminLayout from '@/components/AdminLayout';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [logs, setLogs] = useState<TransactionLog[]>([]);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSessions: 0,
    completedSessions: 0,
    averageOrderValue: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      let startDate = new Date();

      if (timeRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      // Fetch sessions
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc')
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionsData = sessionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate(),
      })) as Session[];

      setSessions(sessionsData);

      // Calculate stats
      const completed = sessionsData.filter((s) => s.status === 'completed');
      const totalRevenue = completed.reduce((sum, s) => sum + s.totalAmount, 0);

      setStats({
        totalRevenue,
        totalSessions: sessionsData.length,
        completedSessions: completed.length,
        averageOrderValue: completed.length > 0 ? totalRevenue / completed.length : 0,
      });

      // Fetch transaction logs
      const logsQuery = query(
        collection(db, 'transactionLogs'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const logsSnapshot = await getDocs(logsQuery);
      const logsData = logsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as TransactionLog[];

      setLogs(logsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const getDailySalesData = () => {
    const days: { [key: string]: number } = {};

    sessions
      .filter((s) => s.status === 'completed')
      .forEach((session) => {
        const date = session.createdAt.toLocaleDateString();
        days[date] = (days[date] || 0) + session.totalAmount / 100;
      });

    return Object.entries(days)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: parseFloat(revenue.toFixed(2)),
      }));
  };

  const getPopularProducts = () => {
    const products: { [key: string]: number } = {};

    sessions
      .filter((s) => s.status === 'completed')
      .forEach((session) => {
        session.basket.forEach((item) => {
          products[item.productName] = (products[item.productName] || 0) + item.quantity;
        });
      });

    return Object.entries(products)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));
  };

  const getHourlyDistribution = () => {
    const hours: { [key: number]: number } = {};

    sessions
      .filter((s) => s.status === 'completed')
      .forEach((session) => {
        const hour = session.createdAt.getHours();
        hours[hour] = (hours[hour] || 0) + 1;
      });

    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      sessions: hours[hour] || 0,
    })).filter((d) => d.sessions > 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const dailySalesData = getDailySalesData();
  const popularProducts = getPopularProducts();
  const hourlyData = getHourlyDistribution();

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Time Range Selector */}
        <div className="flex justify-end mb-8">
          <div className="flex gap-2">
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            icon={<DollarSign className="w-6 h-6" />}
            title="Total Revenue"
            value={`$${(stats.totalRevenue / 100).toFixed(2)}`}
            color="bg-green-500"
          />
          <StatsCard
            icon={<ShoppingBag className="w-6 h-6" />}
            title="Total Sessions"
            value={stats.totalSessions}
            color="bg-blue-500"
          />
          <StatsCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Completed"
            value={stats.completedSessions}
            color="bg-purple-500"
          />
          <StatsCard
            icon={<Package className="w-6 h-6" />}
            title="Avg Order Value"
            value={`$${(stats.averageOrderValue / 100).toFixed(2)}`}
            color="bg-amber-500"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Sales Chart */}
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Sales</h2>
            {dailySalesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#9333ea"
                    strokeWidth={2}
                    name="Revenue ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-600 py-12">No sales data available</p>
            )}
          </div>

          {/* Popular Products Chart */}
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Popular Products</h2>
            {popularProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={popularProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" fill="#9333ea" name="Units Sold" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-600 py-12">No product data available</p>
            )}
          </div>

          {/* Hourly Distribution */}
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Peak Hours</h2>
            {hourlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sessions" fill="#10b981" name="Sessions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-600 py-12">No hourly data available</p>
            )}
          </div>

          {/* Conversion Rate */}
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Session Status</h2>
            {stats.totalSessions > 0 ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary-600 mb-2">
                    {((stats.completedSessions / stats.totalSessions) * 100).toFixed(1)}%
                  </div>
                  <p className="text-gray-600">Completion Rate</p>
                  <div className="mt-6 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-semibold text-green-600">{stats.completedSessions}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold">{stats.totalSessions}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-600 py-12">No session data available</p>
            )}
          </div>
        </div>

        {/* Transaction Logs */}
        <div className="glass-strong rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          {logs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Activity Yet</h3>
              <p className="text-gray-600 text-sm">
                Transaction logs will appear here once customers start using the vending machine.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-600" />
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {log.type.replace(/_/g, ' ')}
                      </p>
                      {log.sessionId && (
                        <p className="text-sm text-gray-600">
                          Session: {log.sessionId.substring(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function StatsCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-6"
    >
      <div className={`w-12 h-12 rounded-xl ${color} text-white flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-gray-600 text-sm mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </motion.div>
  );
}
