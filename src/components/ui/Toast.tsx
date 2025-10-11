import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastItemProps {
  toast: Toast
  onClose: (id: string) => void
}

export function ToastItem({ toast, onClose }: ToastItemProps) {
  useEffect(() => {
    const duration = toast.duration || 5000
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onClose])

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={24} className="text-green-600" />
      case 'error':
        return <AlertCircle size={24} className="text-red-600" />
      case 'warning':
        return <AlertTriangle size={24} className="text-yellow-600" />
      case 'info':
        return <Info size={24} className="text-blue-600" />
    }
  }

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-300 text-green-900'
      case 'error':
        return 'bg-red-50 border-red-300 text-red-900'
      case 'warning':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900'
      case 'info':
        return 'bg-blue-50 border-blue-300 text-blue-900'
    }
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${getStyles()} animate-slide-in-right`}
      style={{
        minWidth: '300px',
        maxWidth: '500px',
      }}
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold break-words">{toast.message}</p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 p-1 hover:bg-white/50 rounded transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      <div className="flex flex-col gap-3 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </div>
    </div>
  )
}
