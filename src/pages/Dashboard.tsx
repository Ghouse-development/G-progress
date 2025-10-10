import { Routes, Route } from 'react-router-dom'
import Layout from '../components/Layout'
import DashboardHome from '../components/DashboardHome'
import ProjectList from './ProjectList'
import ProjectDetail from './ProjectDetail'
import Calendar from './Calendar'
import ProductMaster from '../components/ProductMaster'
import EmployeeMaster from '../components/EmployeeMaster'
import DepartmentMaster from '../components/DepartmentMaster'
import RoleMaster from '../components/RoleMaster'
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
          <Route path="/master/products" element={<ProductMaster />} />
          <Route path="/master/employees" element={<EmployeeMaster />} />
          <Route path="/master/departments" element={<DepartmentMaster />} />
          <Route path="/master/roles" element={<RoleMaster />} />
        </Routes>
      </Layout>
    </ModeProvider>
  )
}
