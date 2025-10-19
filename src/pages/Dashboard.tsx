import { Routes, Route } from 'react-router-dom'
import Layout from '../components/Layout'
import DashboardHome from '../components/DashboardHome'
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
import TaskMasterManagement from '../components/TaskMasterManagement'
import { ModeProvider } from '../contexts/ModeContext'

export default function Dashboard() {
  return (
    <ModeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/import-csv" element={<ImportCSV />} />
          <Route path="/sample" element={<SamplePage />} />
          <Route path="/master/products" element={<ProductMaster />} />
          <Route path="/master/employees" element={<EmployeeMaster />} />
          <Route path="/master/departments" element={<DepartmentMaster />} />
          <Route path="/master/roles" element={<RoleMaster />} />
          <Route path="/master/tasks" element={<TaskMasterManagement />} />
        </Routes>
      </Layout>
    </ModeProvider>
  )
}
