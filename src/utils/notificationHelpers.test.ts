import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createNotification,
  createTaskAssignedNotification,
  createTaskDelayNotification,
  createPaymentOverdueNotification,
  createBulkNotifications
} from './notificationHelpers'
import { supabase } from '../lib/supabase'

// Supabaseのモック
vi.mock('../lib/supabase')

describe('notificationHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createNotification', () => {
    it('通知を正常に作成できる', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      const result = await createNotification({
        userId: 'user-123',
        title: 'テスト通知',
        message: 'これはテスト通知です',
        type: 'task_assigned',
        relatedProjectId: 'project-123'
      })

      expect(result.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        title: 'テスト通知',
        message: 'これはテスト通知です',
        type: 'task_assigned',
        related_project_id: 'project-123',
        related_task_id: undefined,
        read: false
      })
    })

    it('エラー時にfalseを返す', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error')
      })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      const result = await createNotification({
        userId: 'user-123',
        title: 'テスト通知',
        message: 'これはテスト通知です',
        type: 'task_assigned'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('createTaskAssignedNotification', () => {
    it('タスク割当通知を正しいフォーマットで作成する', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      await createTaskAssignedNotification(
        'user-123',
        '設計図作成',
        'project-123',
        'task-123',
        '山田太郎'
      )

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        title: '新しいタスクが割り当てられました',
        message: '山田太郎 様の案件で「設計図作成」が割り当てられました',
        type: 'task_assigned',
        related_project_id: 'project-123',
        related_task_id: 'task-123',
        read: false
      })
    })
  })

  describe('createTaskDelayNotification', () => {
    it('タスク遅延通知を正しいフォーマットで作成する', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      await createTaskDelayNotification(
        'user-123',
        '着工準備',
        'project-123',
        'task-123',
        '田中花子',
        '2024-01-15'
      )

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        title: 'タスクの期限が過ぎています',
        message: '田中花子 様の案件で「着工準備」の期限（2024-01-15）が過ぎています',
        type: 'delay',
        related_project_id: 'project-123',
        related_task_id: 'task-123',
        read: false
      })
    })
  })

  describe('createPaymentOverdueNotification', () => {
    it('支払い遅延通知を正しいフォーマットで作成する', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      await createPaymentOverdueNotification(
        'user-123',
        'contract',
        'project-123',
        '佐藤一郎',
        '2024-02-01'
      )

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        title: '入金の予定日が過ぎています',
        message: '佐藤一郎 様の契約金の入金予定日（2024-02-01）が過ぎています',
        type: 'payment_overdue',
        related_project_id: 'project-123',
        related_task_id: undefined,
        read: false
      })
    })

    it('全ての支払いタイプに対応している', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      const paymentTypes = [
        { type: 'contract', expected: '契約金' },
        { type: 'construction_start', expected: '着工金' },
        { type: 'roof_raising', expected: '上棟金' },
        { type: 'final', expected: '最終金' }
      ]

      for (const { type, expected } of paymentTypes) {
        await createPaymentOverdueNotification(
          'user-123',
          type,
          'project-123',
          'テスト顧客',
          '2024-01-01'
        )

        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining(expected)
          })
        )
      }
    })
  })

  describe('createBulkNotifications', () => {
    it('複数ユーザーへの一斉通知を作成できる', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      const userIds = ['user-1', 'user-2', 'user-3']
      await createBulkNotifications(
        userIds,
        '重要なお知らせ',
        'システムメンテナンスを実施します',
        'task_assigned',
        'project-123'
      )

      expect(mockInsert).toHaveBeenCalledWith([
        {
          user_id: 'user-1',
          title: '重要なお知らせ',
          message: 'システムメンテナンスを実施します',
          type: 'task_assigned',
          related_project_id: 'project-123',
          related_task_id: undefined,
          read: false
        },
        {
          user_id: 'user-2',
          title: '重要なお知らせ',
          message: 'システムメンテナンスを実施します',
          type: 'task_assigned',
          related_project_id: 'project-123',
          related_task_id: undefined,
          read: false
        },
        {
          user_id: 'user-3',
          title: '重要なお知らせ',
          message: 'システムメンテナンスを実施します',
          type: 'task_assigned',
          related_project_id: 'project-123',
          related_task_id: undefined,
          read: false
        }
      ])
    })

    it('エラー時にfalseを返す', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error')
      })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      const result = await createBulkNotifications(
        ['user-1', 'user-2'],
        'テスト',
        'テストメッセージ',
        'task_assigned'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
