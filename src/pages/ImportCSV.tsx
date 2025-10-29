import { useState } from 'react'
import { Upload, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react'
import { parseProjectCSV, importProjectsFromCSV, ImportResult } from '../lib/csvImporter'
import { useSimplePermissions } from '../hooks/usePermissions'
import { useAuditLog } from '../hooks/useAuditLog'
import { useToast } from '../contexts/ToastContext'

export default function ImportCSV() {
  const { canWrite } = useSimplePermissions()
  const { logImport } = useAuditLog()
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<any[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setPreview([])

      // プレビュー表示
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const csvText = event.target?.result as string
          const rows = parseProjectCSV(csvText)
          setPreview(rows.slice(0, 10)) // 最初の10件をプレビュー
        } catch (error: any) {
          toast.error(`CSVファイルの読み込みエラー: ${error.message}`)
        }
      }
      reader.onerror = () => {
        // console removed
        toast.error('ファイルの読み込みに失敗しました')
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('CSVファイルを選択してください')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const csvText = event.target?.result as string
          const rows = parseProjectCSV(csvText)

          if (rows.length === 0) {
            toast.error('インポートするデータがありません')
            setLoading(false)
            return
          }

          // 確認ダイアログ
          const confirmed = window.confirm(
            `${rows.length}件のデータをインポートします。よろしいですか？\n\n※既存データと重複する場合、新規データとして追加されます。`
          )

          if (!confirmed) {
            setLoading(false)
            return
          }

          // インポート実行
          const importResult = await importProjectsFromCSV(rows)
          setResult(importResult)

          // 監査ログ記録
          await logImport(
            'projects',
            importResult.success,
            `CSVから${importResult.success}件のプロジェクトをインポートしました（失敗: ${importResult.failed}件）`
          )

          // 成功時の通知
          if (importResult.success > 0) {
            toast.success(`${importResult.success}件のインポートに成功しました`)
          }
          if (importResult.failed > 0) {
            toast.warning(`${importResult.failed}件のインポートに失敗しました`)
          }
        } catch (error: any) {
          toast.error(`インポートエラー: ${error.message}`)
          // console removed
        } finally {
          setLoading(false)
        }
      }
      reader.onerror = () => {
        // console removed
        toast.error('ファイルの読み込みに失敗しました')
        setLoading(false)
      }
      reader.readAsText(file)
    } catch (error: any) {
      toast.error(`ファイル読み込みエラー: ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">CSV インポート</h2>
        <span className="prisma-badge prisma-badge-orange">管理者専用</span>
      </div>

      {/* アップロード */}
      <div className="prisma-card">
        <h3 className="text-xl font-bold text-gray-900 mb-4">1. CSVファイルを選択</h3>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <label className="cursor-pointer">
              <span className="text-base text-gray-600 mb-2 block">
                進捗管理表CSVファイルをドロップまたはクリックして選択
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button className="prisma-btn prisma-btn-secondary mt-2">
                ファイルを選択
              </button>
            </label>
          </div>

          {file && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <FileText className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-base font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* プレビュー */}
      {preview.length > 0 && (
        <div className="prisma-card">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900">2. データプレビュー</h3>
            <p className="text-base text-gray-600 mt-1">{preview.length}件を表示中</p>
          </div>
          <div className="prisma-table-container">
            <table className="prisma-table">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-900">契約番号</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-900">お客様名</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-900">建設地</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-900">商品</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-900">契約日</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-base text-gray-900">{row['契約\n番号'] || row['契約番号'] || '-'}</td>
                    <td className="px-4 py-3 text-base font-medium text-gray-900">
                      {row['お客様名\n※敬称略'] || row['お客様名'] || '-'}
                    </td>
                    <td className="px-4 py-3 text-base text-gray-600">
                      {row['建設地（住所）\n※住所不在地域は、地番'] || row['建設地'] || '-'}
                    </td>
                    <td className="px-4 py-3 text-base text-gray-900">{row['商品'] || '-'}</td>
                    <td className="px-4 py-3 text-base text-gray-900">{row['請負\n契約'] || row['請負契約'] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* インポート実行 */}
      {preview.length > 0 && (
        <div className="prisma-card">
          <h3 className="text-xl font-bold text-gray-900 mb-4">3. インポート実行</h3>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-base text-yellow-800">
                  <p className="font-semibold mb-2">インポート前の注意事項</p>
                  <ul className="list-disc list-inside space-y-1 text-base">
                    <li>既存データとの重複チェックは行われません</li>
                    <li>すべて新規データとして登録されます</li>
                    <li>商品名が存在しない場合、商品は「未設定」になります</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={loading || !canWrite}
              className="prisma-btn prisma-btn-primary w-full text-lg py-4"
              title={!canWrite ? '権限がありません' : ''}
            >
              {loading ? 'インポート中...' : !canWrite ? '権限がありません' : `${preview.length}件をインポート`}
            </button>
          </div>
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="prisma-card">
          <h3 className="text-xl font-bold text-gray-900 mb-4">4. インポート結果</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-base text-gray-600">成功</p>
                    <p className="text-3xl font-bold text-green-900">{result.success}件</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="text-base text-gray-600">失敗</p>
                    <p className="text-3xl font-bold text-red-900">{result.failed}件</p>
                  </div>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                <p className="text-base font-semibold text-red-900 mb-2">エラー詳細:</p>
                <div className="max-h-40 overflow-y-auto">
                  {result.errors.slice(0, 20).map((error, index) => (
                    <p key={index} className="text-base text-red-700 py-1">
                      • {error}
                    </p>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="text-base text-red-600 mt-2">
                      ...他{result.errors.length - 20}件のエラー
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFile(null)
                  setResult(null)
                  setPreview([])
                }}
                className="prisma-btn prisma-btn-secondary flex-1"
              >
                別のファイルをインポート
              </button>
              <button
                onClick={() => window.location.href = '/projects'}
                className="prisma-btn prisma-btn-primary flex-1"
              >
                案件一覧を確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
