import { useState } from 'react'
import { X, Upload, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import Papa from 'papaparse'

interface CSVImportModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function CSVImportModal({ onClose, onSuccess }: CSVImportModalProps) {
  const { showToast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ success: 0, error: 0, total: 0 })

  const fieldMapping: { [key: string]: string } = {
    '契約番号': 'contract_number',
    'お客様名': 'customer_names',
    '建設地（住所）': 'construction_address',
    '商品': 'product_type',
    '階数': 'floors',
    '坪数(施工)': 'construction_area',
    '請負契約': 'contract_date',
    '設計ヒアリング': 'design_hearing_date',
    'プラン確定': 'plan_finalized_date',
    'プラン確定時資金計画書お客様送付': 'plan_financial_sent_date',
    '構造GO': 'structure_go_date',
    '申請GO': 'application_go_date',
    '構造1回目CB': 'structure_1st_cb_date',
    '構造2回目CB': 'structure_2nd_cb_date',
    '打合せ可能日': 'meeting_available_date',
    '最終打合': 'final_meeting_date',
    '図面UP': 'drawing_upload_date',
    '構造図Up': 'structure_drawing_upload_date',
    '着工許可': 'construction_permit_date',
    '解体開始日': 'demolition_start_date',
    '解体完了日': 'demolition_completion_date',
    '変更契約日': 'change_contract_date',
    '土地決済': 'land_settlement_date',
    '分筆完了日': 'subdivision_completion_date',
    '基礎着工日': 'foundation_start_date',
    '上棟日': 'roof_raising_date',
    '中間検査': 'interim_inspection_date',
    '完了検査': 'completion_inspection_date',
    '引渡日': 'handover_date',
    '外構工事開始日': 'exterior_work_start_date',
    '外構工事完了日': 'exterior_work_completion_date',
    '契約金額': 'contract_amount',
    '申込金日付': 'application_fee_date',
    '申込金金額': 'application_fee_amount',
    '契約金日付': 'contract_payment_date',
    '契約金金額': 'contract_payment_amount',
    '着工金日付': 'construction_start_payment_date',
    '着工金金額': 'construction_start_payment_amount',
    '上棟金日付': 'roof_raising_payment_date',
    '上棟金金額': 'roof_raising_payment_amount',
    '最終金日付': 'final_payment_date',
    '最終金金額': 'final_payment_amount',
    'C値': 'c_value',
    'UA値': 'ua_value',
    'ηAC値': 'eta_ac_value',
    '進捗状況（問題点・アクションプラン）': 'progress_status',
    '備考（お客様個別情報・注意点）': 'notes'
  }

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '') return null
    try {
      const cleaned = dateStr.replace(/[年月]/g, '-').replace(/日/g, '').trim()
      const date = new Date(cleaned)
      if (isNaN(date.getTime())) return null
      return date.toISOString().split('T')[0]
    } catch {
      return null
    }
  }

  const parseNumber = (numStr: string): number | null => {
    if (!numStr || numStr.trim() === '') return null
    try {
      const cleaned = numStr.replace(/,/g, '').trim()
      const num = parseFloat(cleaned)
      return isNaN(num) ? null : num
    } catch {
      return null
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    if (!file) {
      showToast('CSVファイルを選択してください', 'warning')
      return
    }

    setImporting(true)
    setProgress({ success: 0, error: 0, total: 0 })

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const records = results.data as any[]
        setProgress(prev => ({ ...prev, total: records.length }))

        for (const record of records) {
          try {
            const contractNumber = record['契約番号']
            if (!contractNumber) {
              setProgress(prev => ({ ...prev, error: prev.error + 1 }))
              continue
            }

            const updateData: any = {}

            for (const [csvColumn, dbField] of Object.entries(fieldMapping)) {
              const value = record[csvColumn]
              if (!value || value.trim() === '') continue

              if (dbField.includes('_date') || dbField === 'contract_date') {
                const parsedDate = parseDate(value)
                if (parsedDate) updateData[dbField] = parsedDate
              } else if (dbField.includes('_amount') || dbField === 'contract_amount') {
                const parsedNumber = parseNumber(value)
                if (parsedNumber !== null) updateData[dbField] = parsedNumber
              } else if (['construction_area', 'floors', 'c_value', 'ua_value', 'eta_ac_value'].includes(dbField)) {
                const parsedNumber = parseNumber(value)
                if (parsedNumber !== null) updateData[dbField] = parsedNumber
              } else {
                updateData[dbField] = value
              }
            }

            if (record['お客様名']) {
              updateData.customer_names = [record['お客様名']]
            }

            if (Object.keys(updateData).length > 0) {
              const { error } = await supabase
                .from('projects')
                .update(updateData)
                .eq('contract_number', contractNumber)

              if (error) {
                setProgress(prev => ({ ...prev, error: prev.error + 1 }))
              } else {
                setProgress(prev => ({ ...prev, success: prev.success + 1 }))
              }
            } else {
              setProgress(prev => ({ ...prev, error: prev.error + 1 }))
            }
          } catch (err) {
            setProgress(prev => ({ ...prev, error: prev.error + 1 }))
          }
        }

        showToast(`インポート完了: 成功 ${progress.success}件、失敗 ${progress.error}件`, 'success')
        setImporting(false)
        onSuccess()
      },
      error: (error) => {
        showToast('CSVの読み込みに失敗しました', 'error')
        setImporting(false)
      }
    })
  }

  return (
    <div className="prisma-modal-overlay">
      <div className="prisma-modal max-w-[500px]">
        <div className="prisma-modal-header">
          <div className="flex items-center justify-between">
            <h2 className="prisma-modal-title">CSVインポート</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="prisma-modal-content space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <FileText size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-base text-blue-800">
                <p className="font-semibold mb-1">CSVフォーマット</p>
                <p className="text-base">契約番号をキーとして案件情報を更新します。</p>
                <p className="text-base mt-1">対応フィールド: 契約番号、お客様名、建設地、各種日付、金額など</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              CSVファイル選択
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
                disabled={importing}
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload size={32} className="text-gray-400" />
                <span className="text-base text-gray-600 dark:text-gray-400">
                  {file ? file.name : 'CSVファイルを選択してください'}
                </span>
              </label>
            </div>
          </div>

          {importing && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                インポート中...
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center">
                  <div className="font-bold text-green-600">{progress.success}</div>
                  <div className="text-gray-500">成功</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-red-600">{progress.error}</div>
                  <div className="text-gray-500">失敗</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-blue-600">{progress.total}</div>
                  <div className="text-gray-500">合計</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="prisma-modal-footer">
          <button
            onClick={onClose}
            disabled={importing}
            className="prisma-btn prisma-btn-secondary"
          >
            キャンセル
          </button>
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="prisma-btn prisma-btn-primary"
          >
            {importing ? 'インポート中...' : 'インポート'}
          </button>
        </div>
      </div>
    </div>
  )
}
