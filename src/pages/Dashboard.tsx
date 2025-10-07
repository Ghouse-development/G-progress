import { Routes, Route } from 'react-router-dom'
import Layout from '../components/Layout'
import DashboardHome from '../components/DashboardHome'
import ProjectList from './ProjectList'

export default function Dashboard() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/calendar" element={<div>カレンダー</div>} />
      </Routes>
    </Layout>
  )
}
