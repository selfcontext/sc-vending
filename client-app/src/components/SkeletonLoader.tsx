import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export default function SkeletonLoader({
  className = '',
  variant = 'rectangular',
  width,
  height,
}: SkeletonLoaderProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'text':
        return 'rounded h-4';
      case 'rectangular':
      default:
        return 'rounded-lg';
    }
  };

  return (
    <motion.div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 ${getVariantClasses()} ${className}`}
      style={{
        width: width || '100%',
        height: height || (variant === 'text' ? '1rem' : '100%'),
        backgroundSize: '200% 100%',
      }}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        ease: 'linear',
        repeat: Infinity,
      }}
    />
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-strong rounded-3xl overflow-hidden"
        >
          <SkeletonLoader height={300} className="mb-0" />
          <div className="p-6">
            <SkeletonLoader variant="text" className="mb-2" width="70%" />
            <SkeletonLoader variant="text" className="mb-4" width="90%" />
            <div className="flex items-center justify-between">
              <SkeletonLoader variant="text" width={80} />
              <SkeletonLoader width={100} height={40} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-strong rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-4">
        <SkeletonLoader variant="circular" width={48} height={48} />
        <div className="flex-1">
          <SkeletonLoader variant="text" className="mb-2" width="60%" />
          <SkeletonLoader variant="text" width="40%" />
        </div>
      </div>
      <SkeletonLoader height={100} />
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <CardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}
