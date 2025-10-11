import { useState, DragEvent } from 'react'

interface DragItem {
  id: string
  type: string
  data: any
}

export function useDragAndDrop<T = any>() {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)

  // ドラッグ開始
  const handleDragStart = (e: DragEvent, id: string, type: string, data: T) => {
    const item: DragItem = { id, type, data }
    setDraggedItem(item)

    // データをDataTransferにも設定（ブラウザ互換性のため）
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify(item))

    // ドラッグ中のスタイルを設定
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  // ドラッグ終了
  const handleDragEnd = (e: DragEvent) => {
    setDraggedItem(null)
    setDragOverTarget(null)

    // スタイルをリセット
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  // ドラッグオーバー（ドロップ可能エリアに入った）
  const handleDragOver = (e: DragEvent, targetId: string) => {
    e.preventDefault() // デフォルトの動作を防ぐ（ドロップを許可）
    e.dataTransfer.dropEffect = 'move'
    setDragOverTarget(targetId)
  }

  // ドラッグリーブ（ドロップ可能エリアから出た）
  const handleDragLeave = () => {
    setDragOverTarget(null)
  }

  // ドロップ
  const handleDrop = (e: DragEvent, targetId: string, onDrop: (item: DragItem, targetId: string) => void) => {
    e.preventDefault()
    e.stopPropagation()

    // ドラッグされたアイテムを取得
    const item = draggedItem || JSON.parse(e.dataTransfer.getData('text/plain'))

    if (item) {
      onDrop(item, targetId)
    }

    setDraggedItem(null)
    setDragOverTarget(null)
  }

  return {
    draggedItem,
    dragOverTarget,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isDragging: draggedItem !== null,
    isDragOver: (targetId: string) => dragOverTarget === targetId
  }
}
