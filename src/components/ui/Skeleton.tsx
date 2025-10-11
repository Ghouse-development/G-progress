interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200'

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  )
}

// プリセットコンポーネント
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height={16}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg border-2 border-gray-300 p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-3">
          <Skeleton height={24} width="40%" />
          <Skeleton height={16} width="80%" />
          <Skeleton height={16} width="60%" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <Skeleton height={16} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <Skeleton height={16} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SkeletonProjectCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg border-3 border-gray-300 shadow-lg p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton height={28} width="70%" className="mb-2" />
          <Skeleton height={20} width="50%" />
        </div>
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>

      <div className="space-y-2 mb-4">
        <Skeleton height={16} width="100%" />
        <Skeleton height={16} width="80%" />
      </div>

      <div className="grid grid-cols-3 gap-3 pt-4 border-t-2 border-gray-200">
        <Skeleton height={20} />
        <Skeleton height={20} />
        <Skeleton height={20} />
      </div>
    </div>
  )
}

export function SkeletonStat({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg border-2 border-gray-300 p-4 ${className}`}>
      <Skeleton height={16} width="60%" className="mb-2" />
      <Skeleton height={32} width="40%" className="mb-3" />
      <Skeleton height={8} width="100%" />
    </div>
  )
}
