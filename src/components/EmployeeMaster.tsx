import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Employee, Department, Role } from '../types/database'
import { Plus, Edit2, Trash2, X, ArrowLeft, Building2, Shield } from 'lucide-react'

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
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    last_name: '',
    first_name: '',
    department: '' as Department,
    role: 'member' as Role,
    avatar_url: ''
  })

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('role')
      .order('department')
      .order('last_name')

    if (!error && data) {
      setEmployees(data as Employee[])
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
      avatar_url: ''
    })
  }

  const handleSubmit = async () => {
    if (!formData.email.trim() || !formData.last_name.trim() || !formData.first_name.trim()) {
      alert('メールアドレス、姓、名は必須です')
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
            avatar_url: formData.avatar_url || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEmployee.id)

        if (error) throw error
        alert('従業員情報を更新しました')
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
            avatar_url: formData.avatar_url || null
          })

        if (error) throw error
        alert('従業員を追加しました')
      }

      await loadEmployees()
      handleCloseModal()
    } catch (error) {
      console.error('Failed to save employee:', error)
      alert('従業員の保存に失敗しました')
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

      alert('従業員を削除しました')
      await loadEmployees()
    } catch (error) {
      console.error('Failed to delete employee:', error)
      alert('従業員の削除に失敗しました')
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
        return 'bg-gray-100 text-gray-900 border-gray-500'
      default:
        return 'bg-gray-100 text-gray-900 border-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
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
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            title="部門マスタ管理"
          >
            <Building2 size={20} />
            部門マスタ
          </button>
          <button
            onClick={() => navigate('/master/roles')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            title="役職マスタ管理"
          >
            <Shield size={20} />
            役職マスタ
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
      <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-pastel-blue-light">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  氏名
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  メールアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  部門
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  役職
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    従業員が登録されていません
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-pastel-blue-light transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{employee.last_name} {employee.first_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{employee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{employee.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border-2 ${getRoleBadgeClass(employee.role)}`}>
                        {roleLabels[employee.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(employee)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="編集"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(employee)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="削除"
                        >
                          <Trash2 size={18} />
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
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-black">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingEmployee ? '従業員編集' : '新規従業員追加'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-0.5">
                      姓 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="山田"
                      className="w-full px-2.5 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-0.5">
                      名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="太郎"
                      className="w-full px-2.5 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="yamada@example.com"
                    className="w-full px-2.5 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    部門 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value as Department })}
                    className="w-full px-2.5 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    役職 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    className="w-full px-2.5 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="president">社長</option>
                    <option value="executive">役員</option>
                    <option value="department_head">部門長</option>
                    <option value="leader">リーダー</option>
                    <option value="member">メンバー</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    アバターURL
                  </label>
                  <input
                    type="url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-2.5 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-3 py-2 text-base border border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-3 py-2 text-base bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingEmployee ? '更新' : '作成'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
