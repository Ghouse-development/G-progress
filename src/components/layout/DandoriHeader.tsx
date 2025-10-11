import * as React from "react"
import { Search, Bell, User } from "lucide-react"
import { Input } from "../ui/Input"
import { GradientButton } from "../ui/GradientButton"
import { cn } from "../../lib/utils"

export interface DandoriHeaderProps {
  title?: string
  onSearch?: (query: string) => void
  onNewClick?: () => void
  className?: string
}

const DandoriHeader = React.forwardRef<HTMLElement, DandoriHeaderProps>(
  ({ title = "ページタイトル", onSearch, onNewClick, className }, ref) => {
    const [searchQuery, setSearchQuery] = React.useState("")

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value
      setSearchQuery(query)
      onSearch?.(query)
    }

    return (
      <header
        ref={ref}
        className={cn("flex items-center justify-between gap-4 py-4", className)}
      >
        {/* 左: ページタイトル */}
        <div className="flex-shrink-0">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        </div>

        {/* 中央: 検索バー */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="検索..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>
        </div>

        {/* 右: 通知・アバター・新規ボタン */}
        <div className="flex items-center gap-3">
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="通知"
          >
            <Bell className="h-5 w-5 text-gray-600" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="プロフィール"
          >
            <User className="h-5 w-5 text-gray-600" />
          </button>
          {onNewClick && (
            <GradientButton onClick={onNewClick} size="default">
              新規
            </GradientButton>
          )}
        </div>
      </header>
    )
  }
)

DandoriHeader.displayName = "DandoriHeader"

export { DandoriHeader }
