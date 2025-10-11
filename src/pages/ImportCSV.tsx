import { useState } from 'react'
import { Upload, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react'
import { parseProjectCSV, importProjectsFromCSV, ImportResult } from '../lib/csvImporter'
import { SectionCard } from '../components/ui/SectionCard'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

export default function ImportCSV() {
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
          alert(`CSVファイルの読み込みエラー: ${error.message}`)
        }
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!file) {
      alert('CSVファイルを選択してください')
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
            alert('インポートするデータがありません')
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
        } catch (error: any) {
          alert(`インポートエラー: ${error.message}`)
          console.error(error)
        } finally {
          setLoading(false)
        }
      }
      reader.readAsText(file)
    } catch (error: any) {
      alert(`ファイル読み込みエラー: ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">CSV インポート</h2>
        <Badge variant="warning">管理者専用</Badge>
      </div>

      {/* アップロード */}
      <SectionCard title="1. CSVファイルを選択">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <label className="cursor-pointer">
              <span className="text-sm text-gray-600 mb-2 block">
                進捗管理表CSVファイルをドロップまたはクリックして選択
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button variant="outline" size="default" className="mt-2">
                ファイルを選択
              </Button>
            </label>
          </div>

          {file && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <FileText className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* プレビュー */}
      {preview.length > 0 && (
        <SectionCard title="2. データプレビュー" subtitle={`${preview.length}件を表示中`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">契約番号</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">お客様名</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">建設地</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">商品</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">契約日</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4">{row['契約\n番号'] || row['契約番号'] || '-'}</td>
                    <td className="py-3 px-4 font-medium">
                      {row['お客様名\n※敬称略'] || row['お客様名'] || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {row['建設地（住所）\n※住所不在地域は、地番'] || row['建設地'] || '-'}
                    </td>
                    <td className="py-3 px-4">{row['商品'] || '-'}</td>
                    <td className="py-3 px-4">{row['請負\n契約'] || row['請負契約'] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* インポート実行 */}
      {preview.length > 0 && (
        <SectionCard title="3. インポート実行">
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">インポート前の注意事項</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>既存データとの重複チェックは行われません</li>
                    <li>すべて新規データとして登録されます</li>
                    <li>商品名が存在しない場合、商品は「未設定」になります</li>
                    <li>インポート後、データを確認してください</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={handleImport}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:brightness-105"
              size="lg"
            >
              {loading ? 'インポート中...' : `${preview.length}件をインポート`}
            </Button>
          </div>
        </SectionCard>
      )}

      {/* 結果表示 */}
      {result && (
        <SectionCard title="4. インポート結果">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">成功</p>
                    <p className="text-2xl font-bold text-green-900">{result.success}件</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">失敗</p>
                    <p className="text-2xl font-bold text-red-900">{result.failed}件</p>
                  </div>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm font-medium text-red-900 mb-2">エラー詳細:</p>
                <div className="max-h-40 overflow-y-auto">
                  {result.errors.slice(0, 20).map((error, index) => (
                    <p key={index} className="text-xs text-red-700 py-1">
                      • {error}
                    </p>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="text-xs text-red-600 mt-2">
                      ...他{result.errors.length - 20}件のエラー
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null)
                  setResult(null)
                  setPreview([])
                }}
                className="flex-1"
              >
                別のファイルをインポート
              </Button>
              <Button
                onClick={() => window.location.href = '/projects'}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
              >
                案件一覧を確認
              </Button>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
