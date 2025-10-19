import { Routes, Route } from 'react-router-dom'
import LayoutPrisma from '../components/LayoutPrisma'
import DashboardWrapper from '../components/DashboardWrapper'
import ProjectList from './ProjectList'
import ProjectDetail from './ProjectDetail'
import Calendar from './Calendar'
import Reports from './Reports'
import AuditLogs from './AuditLogs'
import SamplePage from './SamplePage'
import ImportCSV from './ImportCSV'
import ProductMaster from '../components/ProductMaster'
import EmployeeMaster from '../components/EmployeeMaster'
import DepartmentMaster from '../components/DepartmentMaster'
import RoleMaster from '../components/RoleMaster'
import NewDashboard from './NewDashboard'
import PaymentManagement from './PaymentManagement'
import PerformanceManagement from './PerformanceManagement'
import TaskMasterManagement from './TaskMasterManagement'
import { ModeProvider } from '../contexts/ModeContext'
import { FiscalYearProvider } from '../contexts/FiscalYearContext'

export default function Dashboard() {
  return (
    <ModeProvider>
      <FiscalYearProvider>
        <LayoutPrisma>
        <Routes>
          <Route path="/" element={<NewDashboard />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/payments" element={<PaymentManagement />} />
          <Route path="/performance" element={<PerformanceManagement />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/import-csv" element={<ImportCSV />} />
          <Route path="/sample" element={<SamplePage />} />
          <Route path="/master/products" element={<ProductMaster />} />
          <Route path="/master/tasks" element={<TaskMasterManagement />} />
          <Route path="/master/employees" element={<EmployeeMaster />} />
          <Route path="/master/departments" element={<DepartmentMaster />} />
          <Route path="/master/roles" element={<RoleMaster />} />
          <Route path="/settings" element={<div className="prisma-content">設定ページ（今後実装）</div>} />
        </Routes>
      </LayoutPrisma>
      </FiscalYearProvider>
    </ModeProvider>
  )
}
