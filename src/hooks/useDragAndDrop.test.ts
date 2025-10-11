import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDragAndDrop } from './useDragAndDrop'
import type { DragEvent } from 'react'

// DragEventのモックヘルパー
const createMockDragEvent = (overrides = {}): Partial<DragEvent> => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  dataTransfer: {
    effectAllowed: 'none',
    dropEffect: 'none',
    getData: vi.fn(() => JSON.stringify({ id: 'test-id', type: 'test', data: {} })),
    setData: vi.fn(),
    clearData: vi.fn(),
    files: [] as any,
    items: [] as any,
    types: []
  } as any,
  currentTarget: {
    style: { opacity: '1' }
  } as any,
  ...overrides
})

describe('useDragAndDrop', () => {
  it('初期状態が正しい', () => {
    const { result } = renderHook(() => useDragAndDrop())

    expect(result.current.draggedItem).toBeNull()
    expect(result.current.dragOverTarget).toBeNull()
    expect(result.current.isDragging).toBe(false)
  })

  it('ドラッグ開始時に状態が更新される', () => {
    const { result } = renderHook(() => useDragAndDrop())
    const mockEvent = createMockDragEvent()
    const testData = { name: 'Test Item' }

    act(() => {
      result.current.handleDragStart(
        mockEvent as DragEvent,
        'item-1',
        'task',
        testData
      )
    })

    expect(result.current.draggedItem).toEqual({
      id: 'item-1',
      type: 'task',
      data: testData
    })
    expect(result.current.isDragging).toBe(true)
    expect(mockEvent.dataTransfer!.effectAllowed).toBe('move')
    expect(mockEvent.dataTransfer!.setData).toHaveBeenCalled()
  })

  it('ドラッグ終了時に状態がクリアされる', () => {
    const { result } = renderHook(() => useDragAndDrop())
    const mockStartEvent = createMockDragEvent()
    const mockEndEvent = createMockDragEvent()

    // ドラッグ開始
    act(() => {
      result.current.handleDragStart(
        mockStartEvent as DragEvent,
        'item-1',
        'task',
        { name: 'Test' }
      )
    })

    expect(result.current.isDragging).toBe(true)

    // ドラッグ終了
    act(() => {
      result.current.handleDragEnd(mockEndEvent as DragEvent)
    })

    expect(result.current.draggedItem).toBeNull()
    expect(result.current.dragOverTarget).toBeNull()
    expect(result.current.isDragging).toBe(false)
  })

  it('ドラッグオーバー時に対象が設定される', () => {
    const { result } = renderHook(() => useDragAndDrop())
    const mockEvent = createMockDragEvent()

    act(() => {
      result.current.handleDragOver(mockEvent as DragEvent, 'target-1')
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockEvent.dataTransfer!.dropEffect).toBe('move')
    expect(result.current.dragOverTarget).toBe('target-1')
    expect(result.current.isDragOver('target-1')).toBe(true)
    expect(result.current.isDragOver('target-2')).toBe(false)
  })

  it('ドラッグリーブ時に対象がクリアされる', () => {
    const { result } = renderHook(() => useDragAndDrop())
    const mockEvent = createMockDragEvent()

    // ドラッグオーバー
    act(() => {
      result.current.handleDragOver(mockEvent as DragEvent, 'target-1')
    })

    expect(result.current.dragOverTarget).toBe('target-1')

    // ドラッグリーブ
    act(() => {
      result.current.handleDragLeave()
    })

    expect(result.current.dragOverTarget).toBeNull()
  })

  it('ドロップ時にコールバックが呼ばれる', () => {
    const { result } = renderHook(() => useDragAndDrop())
    const mockEvent = createMockDragEvent()
    const onDrop = vi.fn()
    const testData = { name: 'Test Item' }

    // ドラッグ開始
    act(() => {
      result.current.handleDragStart(
        mockEvent as DragEvent,
        'item-1',
        'task',
        testData
      )
    })

    // ドロップ
    act(() => {
      result.current.handleDrop(mockEvent as DragEvent, 'target-1', onDrop)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(onDrop).toHaveBeenCalledWith(
      {
        id: 'item-1',
        type: 'task',
        data: testData
      },
      'target-1'
    )
    expect(result.current.draggedItem).toBeNull()
    expect(result.current.dragOverTarget).toBeNull()
  })

  it('ドロップ時にdataTransferからデータを取得できる', () => {
    const { result } = renderHook(() => useDragAndDrop())
    const testItem = { id: 'item-1', type: 'task', data: { name: 'Test' } }
    const mockEvent = createMockDragEvent({
      dataTransfer: {
        getData: vi.fn(() => JSON.stringify(testItem))
      } as any
    })
    const onDrop = vi.fn()

    act(() => {
      result.current.handleDrop(mockEvent as DragEvent, 'target-1', onDrop)
    })

    expect(onDrop).toHaveBeenCalledWith(testItem, 'target-1')
  })

  it('複数のドラッグ操作を連続して実行できる', () => {
    const { result } = renderHook(() => useDragAndDrop())
    const mockEvent = createMockDragEvent()
    const onDrop = vi.fn()

    // 1回目のドラッグ
    act(() => {
      result.current.handleDragStart(
        mockEvent as DragEvent,
        'item-1',
        'task',
        { name: 'First' }
      )
    })

    act(() => {
      result.current.handleDrop(mockEvent as DragEvent, 'target-1', onDrop)
    })

    expect(onDrop).toHaveBeenCalledTimes(1)

    // 2回目のドラッグ
    act(() => {
      result.current.handleDragStart(
        mockEvent as DragEvent,
        'item-2',
        'task',
        { name: 'Second' }
      )
    })

    act(() => {
      result.current.handleDrop(mockEvent as DragEvent, 'target-2', onDrop)
    })

    expect(onDrop).toHaveBeenCalledTimes(2)
    expect(onDrop).toHaveBeenLastCalledWith(
      {
        id: 'item-2',
        type: 'task',
        data: { name: 'Second' }
      },
      'target-2'
    )
  })
})
