import { useState, useEffect } from 'react'
import { Project, Employee } from '../types/database'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { Save } from 'lucide-react'

interface ProjectDetailFieldsProps {
  project: Project
  onUpdate: () => void
}

export default function ProjectDetailFields({ project, onUpdate }: ProjectDetailFieldsProps) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('basic')
  const [formData, setFormData] = useState(project)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('last_name')
    if (data) setEmployees(data)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update(formData)
        .eq('id', project.id)

      if (error) throw error

      showToast('案件情報を更新しました', 'success')
      onUpdate()
    } catch (error) {
      console.error('Failed to update project:', error)
      showToast('更新に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'basic', label: '基本情報' },
    { id: 'schedule', label: 'スケジュール' },
    { id: 'loan', label: '融資関連' },
    { id: 'demolition', label: '解体・土地' },
    { id: 'construction', label: '工事' },
    { id: 'payment', label: '金額' },
    { id: 'performance', label: '性能値' }
  ]

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-sm">
      {/* タブヘッダー */}
      <div className="flex border-b-2 border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div className="p-6">
        {/* 基本情報 */}
        {activeTab === 'basic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">契約番号</label>
              <input
                type="text"
                value={formData.contract_number || ''}
                onChange={e => setFormData({ ...formData, contract_number: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">建設地（住所）</label>
              <input
                type="text"
                value={formData.construction_address || ''}
                onChange={e => setFormData({ ...formData, construction_address: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">地番</label>
              <input
                type="text"
                value={formData.lot_number || ''}
                onChange={e => setFormData({ ...formData, lot_number: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">営業担当</label>
              <select
                value={formData.sales_staff_id || ''}
                onChange={e => setFormData({ ...formData, sales_staff_id: e.target.value || undefined })}
                className="prisma-input"
              >
                <option value="">未選択</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.last_name} {emp.first_name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">設計担当</label>
              <select
                value={formData.design_staff_id || ''}
                onChange={e => setFormData({ ...formData, design_staff_id: e.target.value || undefined })}
                className="prisma-input"
              >
                <option value="">未選択</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.last_name} {emp.first_name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">IC担当</label>
              <select
                value={formData.ic_staff_id || ''}
                onChange={e => setFormData({ ...formData, ic_staff_id: e.target.value || undefined })}
                className="prisma-input"
              >
                <option value="">未選択</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.last_name} {emp.first_name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">工事担当</label>
              <select
                value={formData.construction_staff_id || ''}
                onChange={e => setFormData({ ...formData, construction_staff_id: e.target.value || undefined })}
                className="prisma-input"
              >
                <option value="">未選択</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.last_name} {emp.first_name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">外構担当</label>
              <select
                value={formData.exterior_staff_id || ''}
                onChange={e => setFormData({ ...formData, exterior_staff_id: e.target.value || undefined })}
                className="prisma-input"
              >
                <option value="">未選択</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.last_name} {emp.first_name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">階数</label>
              <input
                type="number"
                value={formData.floors || ''}
                onChange={e => setFormData({ ...formData, floors: parseInt(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">坪数（施工）</label>
              <input
                type="number"
                step="0.01"
                value={formData.construction_area || ''}
                onChange={e => setFormData({ ...formData, construction_area: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">進捗状況（問題点・アクションプラン）</label>
              <textarea
                value={formData.progress_status || ''}
                onChange={e => setFormData({ ...formData, progress_status: e.target.value })}
                rows={3}
                className="prisma-input resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">備考（お客様個別情報・注意点）</label>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="prisma-input resize-none"
              />
            </div>
          </div>
        )}

        {/* スケジュール */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">設計ヒアリング</label>
              <input
                type="date"
                value={formData.design_hearing_date || ''}
                onChange={e => setFormData({ ...formData, design_hearing_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">プラン確定</label>
              <input
                type="date"
                value={formData.plan_finalized_date || ''}
                onChange={e => setFormData({ ...formData, plan_finalized_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">資金計画書送付</label>
              <input
                type="date"
                value={formData.plan_financial_sent_date || ''}
                onChange={e => setFormData({ ...formData, plan_financial_sent_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">構造GO</label>
              <input
                type="date"
                value={formData.structure_go_date || ''}
                onChange={e => setFormData({ ...formData, structure_go_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">申請GO</label>
              <input
                type="date"
                value={formData.application_go_date || ''}
                onChange={e => setFormData({ ...formData, application_go_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">最終打合</label>
              <input
                type="date"
                value={formData.final_meeting_date || ''}
                onChange={e => setFormData({ ...formData, final_meeting_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">図面UP</label>
              <input
                type="date"
                value={formData.drawing_upload_date || ''}
                onChange={e => setFormData({ ...formData, drawing_upload_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">着工許可</label>
              <input
                type="date"
                value={formData.construction_permit_date || ''}
                onChange={e => setFormData({ ...formData, construction_permit_date: e.target.value })}
                className="prisma-input"
              />
            </div>
          </div>
        )}

        {/* 融資関連 */}
        {activeTab === 'loan' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="long_term_loan"
                checked={formData.long_term_loan || false}
                onChange={e => setFormData({ ...formData, long_term_loan: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="long_term_loan" className="text-sm font-medium text-gray-700">
                長期融資
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="flat_loan"
                checked={formData.flat_loan || false}
                onChange={e => setFormData({ ...formData, flat_loan: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="flat_loan" className="text-sm font-medium text-gray-700">
                フラット融資
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">銀行名</label>
              <input
                type="text"
                value={formData.bank_name || ''}
                onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">補助金種別</label>
              <input
                type="text"
                value={formData.subsidy_type || ''}
                onChange={e => setFormData({ ...formData, subsidy_type: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">長期要件</label>
              <textarea
                value={formData.long_term_requirements || ''}
                onChange={e => setFormData({ ...formData, long_term_requirements: e.target.value })}
                rows={2}
                className="prisma-input resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">GX要件</label>
              <textarea
                value={formData.gx_requirements || ''}
                onChange={e => setFormData({ ...formData, gx_requirements: e.target.value })}
                rows={2}
                className="prisma-input resize-none"
              />
            </div>
          </div>
        )}

        {/* 解体・土地 */}
        {activeTab === 'demolition' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="demolition"
                checked={formData.demolition || false}
                onChange={e => setFormData({ ...formData, demolition: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="demolition" className="text-sm font-medium text-gray-700">
                解体工事あり
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">解体業者</label>
              <input
                type="text"
                value={formData.demolition_contractor || ''}
                onChange={e => setFormData({ ...formData, demolition_contractor: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">解体開始日</label>
              <input
                type="date"
                value={formData.demolition_start_date || ''}
                onChange={e => setFormData({ ...formData, demolition_start_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">解体完了日</label>
              <input
                type="date"
                value={formData.demolition_completion_date || ''}
                onChange={e => setFormData({ ...formData, demolition_completion_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">土地決済</label>
              <input
                type="date"
                value={formData.land_settlement_date || ''}
                onChange={e => setFormData({ ...formData, land_settlement_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="subdivision"
                checked={formData.subdivision || false}
                onChange={e => setFormData({ ...formData, subdivision: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="subdivision" className="text-sm font-medium text-gray-700">
                分筆あり
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">分筆完了日</label>
              <input
                type="date"
                value={formData.subdivision_completion_date || ''}
                onChange={e => setFormData({ ...formData, subdivision_completion_date: e.target.value })}
                className="prisma-input"
              />
            </div>
          </div>
        )}

        {/* 工事 */}
        {activeTab === 'construction' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">基礎着工日</label>
              <input
                type="date"
                value={formData.foundation_start_date || ''}
                onChange={e => setFormData({ ...formData, foundation_start_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">上棟日</label>
              <input
                type="date"
                value={formData.roof_raising_date || ''}
                onChange={e => setFormData({ ...formData, roof_raising_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">中間検査</label>
              <input
                type="date"
                value={formData.interim_inspection_date || ''}
                onChange={e => setFormData({ ...formData, interim_inspection_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">完了検査</label>
              <input
                type="date"
                value={formData.completion_inspection_date || ''}
                onChange={e => setFormData({ ...formData, completion_inspection_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">引渡日</label>
              <input
                type="date"
                value={formData.handover_date || ''}
                onChange={e => setFormData({ ...formData, handover_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">外構工事開始日</label>
              <input
                type="date"
                value={formData.exterior_work_start_date || ''}
                onChange={e => setFormData({ ...formData, exterior_work_start_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">外構工事完了日</label>
              <input
                type="date"
                value={formData.exterior_work_completion_date || ''}
                onChange={e => setFormData({ ...formData, exterior_work_completion_date: e.target.value })}
                className="prisma-input"
              />
            </div>
          </div>
        )}

        {/* 金額 */}
        {activeTab === 'payment' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">契約金額</label>
              <input
                type="number"
                value={formData.contract_amount || ''}
                onChange={e => setFormData({ ...formData, contract_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">申込金日付</label>
              <input
                type="date"
                value={formData.application_fee_date || ''}
                onChange={e => setFormData({ ...formData, application_fee_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">申込金金額</label>
              <input
                type="number"
                value={formData.application_fee_amount || ''}
                onChange={e => setFormData({ ...formData, application_fee_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">着工金日付</label>
              <input
                type="date"
                value={formData.construction_start_payment_date || ''}
                onChange={e => setFormData({ ...formData, construction_start_payment_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">着工金金額</label>
              <input
                type="number"
                value={formData.construction_start_payment_amount || ''}
                onChange={e => setFormData({ ...formData, construction_start_payment_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">上棟金日付</label>
              <input
                type="date"
                value={formData.roof_raising_payment_date || ''}
                onChange={e => setFormData({ ...formData, roof_raising_payment_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">上棟金金額</label>
              <input
                type="number"
                value={formData.roof_raising_payment_amount || ''}
                onChange={e => setFormData({ ...formData, roof_raising_payment_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">最終金日付</label>
              <input
                type="date"
                value={formData.final_payment_date || ''}
                onChange={e => setFormData({ ...formData, final_payment_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">最終金金額</label>
              <input
                type="number"
                value={formData.final_payment_amount || ''}
                onChange={e => setFormData({ ...formData, final_payment_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
          </div>
        )}

        {/* 性能値 */}
        {activeTab === 'performance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">C値</label>
              <input
                type="number"
                step="0.01"
                value={formData.c_value || ''}
                onChange={e => setFormData({ ...formData, c_value: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">UA値</label>
              <input
                type="number"
                step="0.01"
                value={formData.ua_value || ''}
                onChange={e => setFormData({ ...formData, ua_value: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ηAC値</label>
              <input
                type="number"
                step="0.01"
                value={formData.eta_ac_value || ''}
                onChange={e => setFormData({ ...formData, eta_ac_value: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="zeh_certified"
                checked={formData.zeh_certified || false}
                onChange={e => setFormData({ ...formData, zeh_certified: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="zeh_certified" className="text-sm font-medium text-gray-700">
                ZEH認証
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 保存ボタン */}
      <div className="border-t-2 border-gray-200 px-6 py-4 bg-gray-50">
        <button
          onClick={handleSave}
          disabled={saving}
          className="prisma-btn prisma-btn-primary"
        >
          <Save size={16} />
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
