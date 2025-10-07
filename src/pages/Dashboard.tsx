import { Routes, Route } from 'react-router-dom'
import Layout from '../components/Layout'
import DashboardHome from '../components/DashboardHome'

export default function Dashboard() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/projects" element={<div>案件一覧</div>} />
        <Route path="/calendar" element={<div>カレンダー</div>} />
      </Routes>
    </Layout>
  )
}
