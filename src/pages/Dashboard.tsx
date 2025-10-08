import { Routes, Route } from 'react-router-dom'
import Layout from '../components/Layout'
import DashboardHome from '../components/DashboardHome'
import ProjectList from './ProjectList'
import ProjectDetail from './ProjectDetail'
import Calendar from './Calendar'
import AdminProgress from './AdminProgress'

export default function Dashboard() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/admin/progress" element={<AdminProgress />} />
      </Routes>
    </Layout>
  )
}
