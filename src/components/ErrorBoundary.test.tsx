import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

// エラーをスローするテストコンポーネント
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>正常なコンポーネント</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // コンソールエラーをモック（テスト出力をクリーンに保つため）
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('エラーが発生しない場合、子コンポーネントを正常に表示する', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('正常なコンポーネント')).toBeInTheDocument()
  })

  it('エラーが発生した場合、エラーメッセージを表示する', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByRole('heading', { name: /予期しないエラーが発生しました/i })).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('リロードボタンが表示される', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByText('ページをリロード')
    expect(reloadButton).toBeInTheDocument()
  })
})
