import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize: number
  totalItems: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      let start = Math.max(2, currentPage - 1)
      let end = Math.min(totalPages - 1, currentPage + 1)

      if (currentPage <= 3) {
        end = 4
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3
      }

      if (start > 2) {
        pages.push('...')
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (end < totalPages - 1) {
        pages.push('...')
      }

      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t-2 border-gray-300 sm:px-6">
      {/* モバイル表示 */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 text-sm font-bold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          前へ
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-bold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          次へ
        </button>
      </div>

      {/* デスクトップ表示 */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700 font-medium">
            表示中: <span className="font-bold">{startItem}</span> 〜{' '}
            <span className="font-bold">{endItem}</span> /{' '}
            <span className="font-bold">{totalItems}</span> 件
          </p>
        </div>
        <div>
          <nav className="inline-flex -space-x-px rounded-lg shadow-sm" aria-label="Pagination">
            {/* 最初のページ */}
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-lg px-2 py-2 text-gray-700 border-2 border-gray-300 bg-white hover:bg-gray-50 focus:z-20 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              title="最初のページ"
            >
              <ChevronsLeft size={18} />
            </button>

            {/* 前のページ */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 text-gray-700 border-y-2 border-gray-300 bg-white hover:bg-gray-50 focus:z-20 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              title="前のページ"
            >
              <ChevronLeft size={18} />
            </button>

            {/* ページ番号 */}
            {getPageNumbers().map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-bold text-gray-700 border-y-2 border-gray-300 bg-white"
                  >
                    ...
                  </span>
                )
              }

              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page as number)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-bold border-y-2 border-gray-300 focus:z-20 ${
                    currentPage === page
                      ? 'z-10 bg-blue-600 border-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            })}

            {/* 次のページ */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 text-gray-700 border-y-2 border-gray-300 bg-white hover:bg-gray-50 focus:z-20 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              title="次のページ"
            >
              <ChevronRight size={18} />
            </button>

            {/* 最後のページ */}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-lg px-2 py-2 text-gray-700 border-2 border-gray-300 bg-white hover:bg-gray-50 focus:z-20 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              title="最後のページ"
            >
              <ChevronsRight size={18} />
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}
