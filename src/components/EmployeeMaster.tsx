import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Employee, Department, Role, Branch } from '../types/database'
import { Plus, Edit2, Trash2, X, ArrowLeft, Building2, Shield, MapPin } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

// Role表示名マッピング
const roleLabels: Record<Role, string> = {
  president: '社長',
  executive: '役員',
  department_head: '部門長',
  leader: 'リーダー',
  member: 'メンバー'
}

// 部門一覧
const departments: Department[] = [
  '営業',
  '営業事務',
  'ローン事務',
  '実施設計',
  '意匠設計',
  '申請設計',
  '構造設計',
  'IC',
  '工事',
  '発注・積算',
  '工事事務',
  '外構設計',
  '外構工事',
  'システム開発部',
  '商品企画部',
  '広告マーケティング部',
  'CS推進部',
  '不動産事業部',
  '外構事業部',
  '経営管理部',
  '経営企画部',
  'その他'
]

export default function EmployeeMaster() {
  const navigate = useNavigate()
  const toast = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    last_name: '',
    first_name: '',
    department: '' as Department,
    role: 'member' as Role,
    branch_id: '',
    avatar_url: ''
  })

  useEffect(() => {
    loadEmployees()
    loadBranches()
  }, [])

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*, branch:branches(*)')
      .order('role')
      .order('department')
      .order('last_name')

    if (!error && data) {
      setEmployees(data as Employee[])
    }
  }

  const loadBranches = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name')

    if (!error && data) {
      setBranches(data as Branch[])
    }
  }

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee)
      setFormData({
        email: employee.email,
        last_name: employee.last_name,
        first_name: employee.first_name,
        department: employee.department,
        role: employee.role,
        branch_id: employee.branch_id || '',
        avatar_url: employee.avatar_url || ''
      })
    } else {
      setEditingEmployee(null)
      setFormData({
        email: '',
        last_name: '',
        first_name: '',
        department: '営業',
        role: 'member',
        branch_id: '',
        avatar_url: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingEmployee(null)
    setFormData({
      email: '',
      last_name: '',
      first_name: '',
      department: '営業',
      role: 'member',
      branch_id: '',
      avatar_url: ''
    })
  }

  const handleSubmit = async () => {
    if (!formData.email.trim() || !formData.last_name.trim() || !formData.first_name.trim()) {
      toast.warning('メールアドレス、姓、名は必須です')
      return
    }

    try {
      if (editingEmployee) {
        // 更新
        const { error } = await supabase
          .from('employees')
          .update({
            email: formData.email,
            last_name: formData.last_name,
            first_name: formData.first_name,
            department: formData.department,
            role: formData.role,
            branch_id: formData.branch_id || null,
            avatar_url: formData.avatar_url || null
          })
          .eq('id', editingEmployee.id)

        if (error) throw error
        toast.success('従業員情報を更新しました')
      } else {
        // 新規作成
        const { error } = await supabase
          .from('employees')
          .insert({
            email: formData.email,
            last_name: formData.last_name,
            first_name: formData.first_name,
            department: formData.department,
            role: formData.role,
            branch_id: formData.branch_id || null,
            avatar_url: formData.avatar_url || null
          })

        if (error) throw error
        toast.success('従業員を追加しました')
      }

      await loadEmployees()
      handleCloseModal()
    } catch (error) {
      toast.error('従業員の保存に失敗しました')
    }
  }

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`「${employee.last_name} ${employee.first_name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employee.id)

      if (error) throw error

      toast.success('従業員を削除しました')
      await loadEmployees()
    } catch (error) {
      toast.error('従業員の削除に失敗しました')
    }
  }

  // 役職別の背景色クラス
  const getRoleBadgeClass = (role: Role) => {
    switch (role) {
      case 'president':
        return 'bg-purple-100 text-purple-900 border-purple-500'
      case 'executive':
        return 'bg-pink-100 text-pink-900 border-pink-500'
      case 'department_head':
        return 'bg-blue-100 text-blue-900 border-blue-500'
      case 'leader':
        return 'bg-green-100 text-green-900 border-green-500'
      case 'member':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-500'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
            title="前の画面に戻る"
          >
            <ArrowLeft size={20} />
            戻る
          </button>
          <h2 className="text-2xl font-light text-black">従業員マスタ管理</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/master/departments')}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors font-medium shadow-sm"
            title="部門マスタ管理"
          >
            <Building2 size={20} />
            部門マスタ
          </button>
          <button
            onClick={() => navigate('/master/roles')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-colors font-medium shadow-sm"
            title="役職マスタ管理"
          >
            <Shield size={20} />
            役職マスタ
          </button>
          <button
            onClick={() => navigate('/master/branches')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition-colors font-medium shadow-sm"
            title="拠点マスタ管理"
          >
            <MapPin size={20} />
            拠点マスタ
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={20} />
            新規従業員追加
          </button>
        </div>
      </div>

      {/* 従業員一覧テーブル */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-pastel-blue dark:border-gray-600 shadow-pastel-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <colgroup>
              <col style={{ width: '150px' }} />
              <col style={{ width: '250px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '120px' }} />
            </colgroup>
            <thead className="bg-pastel-blue-light dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  氏名
                </th>
                <th className="px-6 py-3 text-left text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  メールアドレス
                </th>
                <th className="px-6 py-3 text-left text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  部門
                </th>
                <th className="px-6 py-3 text-left text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  拠点
                </th>
                <th className="px-6 py-3 text-left text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  役職
                </th>
                <th className="px-6 py-3 text-center text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    従業員が登録されていません
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-pastel-blue-light transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base font-bold text-gray-900 dark:text-gray-100">{employee.last_name} {employee.first_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-gray-600 dark:text-gray-300">{employee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base font-medium text-gray-900 dark:text-gray-100">{employee.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-gray-600 dark:text-gray-300">
                        {employee.branch?.name || '未設定'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-base font-bold rounded-full border-2 ${getRoleBadgeClass(employee.role)}`}>
                        {roleLabels[employee.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(employee)}
                          className="prisma-btn-icon"
                          title="編集"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(employee)}
                          className="prisma-btn-icon-danger"
                          title="削除"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 従業員追加/編集モーダル */}
      {showModal && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal max-w-[500px]">
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">
                  {editingEmployee ? '従業員編集' : '新規従業員追加'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    姓 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="山田"
                    className="prisma-input"
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="太郎"
                    className="prisma-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="yamada@example.com"
                  className="prisma-input"
                />
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  部門 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value as Department })}
                  className="prisma-select"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  役職 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="prisma-select"
                >
                  <option value="president">社長</option>
                  <option value="executive">役員</option>
                  <option value="department_head">部門長</option>
                  <option value="leader">リーダー</option>
                  <option value="member">メンバー</option>
                </select>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  拠点
                </label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  className="prisma-select"
                >
                  <option value="">未設定</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  アバターURL
                </label>
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="prisma-input"
                />
              </div>
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer">
              <button
                type="button"
                onClick={handleCloseModal}
                className="prisma-btn prisma-btn-secondary"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="prisma-btn prisma-btn-primary"
              >
                {editingEmployee ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
