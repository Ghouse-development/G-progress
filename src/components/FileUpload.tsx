import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, File, Download, Trash2, FileText, Image, FileArchive } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

interface UploadedFile {
  id: string
  name: string
  path: string
  size: number
  type: string
  created_at: string
  public_url?: string
}

interface FileUploadProps {
  projectId?: string
  taskId?: string
  onUploadComplete?: () => void
}

export default function FileUpload({ projectId, taskId, onUploadComplete }: FileUploadProps) {
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)

  // ファイル一覧を読み込み
  const loadFiles = async () => {
    try {
      setLoading(true)

      // プロジェクトまたはタスクに紐づくファイルを取得
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq(projectId ? 'project_id' : 'task_id', projectId || taskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        // 公開URLを生成
        const filesWithUrls = data.map(file => {
          const { data: urlData } = supabase.storage
            .from('project-files')
            .getPublicUrl(file.path)

          return {
            ...file,
            public_url: urlData.publicUrl
          }
        })
        setFiles(filesWithUrls as UploadedFile[])
      }
    } catch (error) {
      toast.error('ファイル一覧の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // ページ読み込み時にファイル一覧を取得
  useEffect(() => {
    loadFiles()
  }, [projectId, taskId])

  // ファイルアップロード処理
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)

    try {
      for (const file of Array.from(selectedFiles)) {
        // ファイルサイズチェック（10MB制限）
        if (file.size > 10 * 1024 * 1024) {
          toast.warning(`${file.name} は10MBを超えているためアップロードできません`)
          continue
        }

        // ユニークなファイルパスを生成
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const fileExt = file.name.split('.').pop()
        const filePath = `${projectId || taskId}/${timestamp}-${randomStr}.${fileExt}`

        // Supabase Storageにアップロード
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        // データベースにファイル情報を保存
        const { error: dbError } = await supabase
          .from('project_files')
          .insert({
            project_id: projectId || null,
            task_id: taskId || null,
            name: file.name,
            path: filePath,
            size: file.size,
            type: file.type
          })

        if (dbError) throw dbError

        toast.success(`${file.name} をアップロードしました`)
      }

      // ファイル一覧を再読み込み
      await loadFiles()

      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (error) {
      toast.error('ファイルのアップロードに失敗しました')
    } finally {
      setUploading(false)
      // input要素をリセット
      event.target.value = ''
    }
  }

  // ファイル削除処理
  const handleDeleteFile = async (file: UploadedFile) => {
    if (!confirm(`「${file.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      // Storageから削除
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([file.path])

      if (storageError) throw storageError

      // データベースから削除
      const { error: dbError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', file.id)

      if (dbError) throw dbError

      toast.success('ファイルを削除しました')
      await loadFiles()
    } catch (error) {
      toast.error('ファイルの削除に失敗しました')
    }
  }

  // ファイルタイプに応じたアイコンを返す
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image size={20} className="text-blue-600" />
    } else if (type === 'application/pdf') {
      return <FileText size={20} className="text-red-600" />
    } else if (type.includes('zip') || type.includes('rar')) {
      return <FileArchive size={20} className="text-yellow-600" />
    } else {
      return <File size={20} className="text-gray-600" />
    }
  }

  // ファイルサイズをフォーマット
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* アップロードボタン */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium">
          <Upload size={20} />
          {uploading ? 'アップロード中...' : 'ファイルを選択'}
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
          />
        </label>
        <p className="text-sm text-gray-600">最大10MB、複数選択可能</p>
      </div>

      {/* ファイル一覧 */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border-2 border-gray-300 p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-gray-300 p-8 text-center">
          <File size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">アップロードされたファイルはありません</p>
          <p className="text-sm text-gray-500 mt-2">上のボタンからファイルをアップロードしてください</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-lg border-2 border-gray-300 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                {/* ファイルアイコン */}
                <div className="flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>

                {/* ファイル情報 */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 truncate">{file.name}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{new Date(file.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>

                {/* アクション */}
                <div className="flex items-center gap-2">
                  {/* ダウンロードボタン */}
                  <a
                    href={file.public_url}
                    download={file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="ダウンロード"
                  >
                    <Download size={18} />
                  </a>

                  {/* 削除ボタン */}
                  <button
                    onClick={() => handleDeleteFile(file)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="削除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
