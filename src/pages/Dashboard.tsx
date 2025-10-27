import { Routes, Route } from 'react-router-dom'
import LayoutPrisma from '../components/LayoutPrisma'
import DashboardWrapper from '../components/DashboardWrapper'
import ProjectList from './ProjectList'
import ProjectDetail from './ProjectDetail'
import Calendar from './Calendar'
import Reports from './Reports'
import AuditLogs from './AuditLogs'
import ImportCSV from './ImportCSV'
import ProductMaster from '../components/ProductMaster'
import EmployeeMaster from '../components/EmployeeMaster'
import DepartmentMaster from '../components/DepartmentMaster'
import RoleMaster from '../components/RoleMaster'
import BranchMaster from '../components/BranchMaster'
import NewDashboard from './NewDashboard'
import PaymentManagement from './PaymentManagement'
import PerformanceManagement from './PerformanceManagement'
import TaskMasterManagement from './TaskMasterManagement'
import TaskByPosition from './TaskByPosition'
import DelayedTasks from './DelayedTasks'
import Settings from './Settings'
import TopPage from './TopPage'
import GrossProfitManagement from './GrossProfitManagement'
import ApprovalFlow from './ApprovalFlow'
import OrganizationManagement from './OrganizationManagement'
import TaskBoard from './TaskBoard'
import { ModeProvider } from '../contexts/ModeContext'
import { FiscalYearProvider } from '../contexts/FiscalYearContext'
import { SettingsProvider } from '../contexts/SettingsContext'

export default function Dashboard() {
  return (
    <SettingsProvider>
      <ModeProvider>
        <FiscalYearProvider>
          <Routes>
            {/* すべてのページにLayoutPrismaを適用（デザイン統一） */}
            <Route path="/*" element={
              <LayoutPrisma>
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
              </LayoutPrisma>
            } />
          </Routes>
        </FiscalYearProvider>
      </ModeProvider>
    </SettingsProvider>
  )
}
