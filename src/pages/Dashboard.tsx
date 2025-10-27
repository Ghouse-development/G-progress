import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import LayoutPrisma from '../components/LayoutPrisma'
import { ModeProvider } from '../contexts/ModeContext'
import { FiscalYearProvider } from '../contexts/FiscalYearContext'
import { SettingsProvider } from '../contexts/SettingsContext'

// ローディングコンポーネント
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
      <p className="text-lg font-bold text-gray-900">読み込み中...</p>
    </div>
  </div>
)

// 動的インポート（コード分割）- ページアクセス時に必要な分だけ読み込み
const TopPage = lazy(() => import('./TopPage'))
const NewDashboard = lazy(() => import('./NewDashboard'))
const TaskBoard = lazy(() => import('./TaskBoard'))
const ProjectList = lazy(() => import('./ProjectList'))
const ProjectDetail = lazy(() => import('./ProjectDetail'))
const PaymentManagement = lazy(() => import('./PaymentManagement'))
const GrossProfitManagement = lazy(() => import('./GrossProfitManagement'))
const PerformanceManagement = lazy(() => import('./PerformanceManagement'))
const Calendar = lazy(() => import('./Calendar'))
const TaskByPosition = lazy(() => import('./TaskByPosition'))
const DelayedTasks = lazy(() => import('./DelayedTasks'))
const ApprovalFlow = lazy(() => import('./ApprovalFlow'))
const Reports = lazy(() => import('./Reports'))
const AuditLogs = lazy(() => import('./AuditLogs'))
const ImportCSV = lazy(() => import('./ImportCSV'))
const OrganizationManagement = lazy(() => import('./OrganizationManagement'))
const Settings = lazy(() => import('./Settings'))
const TaskMasterManagement = lazy(() => import('./TaskMasterManagement'))
const ProductMaster = lazy(() => import('../components/ProductMaster'))
const EmployeeMaster = lazy(() => import('../components/EmployeeMaster'))
const DepartmentMaster = lazy(() => import('../components/DepartmentMaster'))
const RoleMaster = lazy(() => import('../components/RoleMaster'))
const BranchMaster = lazy(() => import('../components/BranchMaster'))

export default function Dashboard() {
  return (
    <SettingsProvider>
      <ModeProvider>
        <FiscalYearProvider>
          <Routes>
            {/* すべてのページにLayoutPrismaを適用（デザイン統一） */}
            <Route path="/*" element={
              <LayoutPrisma>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<TopPage />} />
                    <Route path="/dashboard" element={<NewDashboard />} />
                    <Route path="/task-board" element={<TaskBoard />} />
                    <Route path="/projects" element={<ProjectList />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/payments" element={<PaymentManagement />} />
                    <Route path="/gross-profit" element={<GrossProfitManagement />} />
                    <Route path="/performance" element={<PerformanceManagement />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/tasks-by-position" element={<TaskByPosition />} />
                    <Route path="/delayed-tasks" element={<DelayedTasks />} />
                    <Route path="/employee-management" element={<EmployeeMaster />} />
                    <Route path="/approval-flow" element={<ApprovalFlow />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/audit-logs" element={<AuditLogs />} />
                    <Route path="/import-csv" element={<ImportCSV />} />
                    <Route path="/organizations" element={<OrganizationManagement />} />
                    <Route path="/master/products" element={<ProductMaster />} />
                    <Route path="/master/tasks" element={<TaskMasterManagement />} />
                    <Route path="/master/employees" element={<EmployeeMaster />} />
                    <Route path="/master/departments" element={<DepartmentMaster />} />
                    <Route path="/master/roles" element={<RoleMaster />} />
                    <Route path="/master/branches" element={<BranchMaster />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Suspense>
              </LayoutPrisma>
            } />
          </Routes>
        </FiscalYearProvider>
      </ModeProvider>
    </SettingsProvider>
  )
}
