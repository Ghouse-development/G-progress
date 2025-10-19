/**
 * 性能管理ページ
 *
 * 太陽光・蓄電池・UA値・C値などの性能データを表示
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Project } from '../types/database'
import { useFiscalYear } from '../contexts/FiscalYearContext'
import { useMode } from '../contexts/ModeContext'
import { useSettings } from '../contexts/SettingsContext'
import { generateDemoProjects, generateDemoCustomers } from '../utils/demoData'
import Papa from 'papaparse'
import jsPDF from 'jspdf'

interface PerformanceStats {
  totalProjects: number
  solarPanelCount: number
  solarPanelPercentage: number
  avgSolarKw: number
  batteryCount: number
  batteryPercentage: number
  belsCount: number
  belsPercentage: number
  avgPrimaryEnergy1: number
  avgPrimaryEnergy2: number
  avgPrimaryEnergy3: number
  avgUaValue: number
  minUaValue: number
  maxUaValue: number
  avgCValue: number
  minCValue: number
  maxCValue: number
}

export default function PerformanceManagement() {
  const { selectedYear } = useFiscalYear()
  const { mode } = useMode()
  const { demoMode } = useSettings()
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [selectedYear, mode, demoMode])

  const loadProjects = async () => {
    setLoading(true)

    if (demoMode) {
      // デモモード：サンプルデータを使用（モード別にデータ件数を調整）
      const demoProjects = generateDemoProjects(mode as 'my_tasks' | 'branch' | 'admin')
      const demoCustomers = generateDemoCustomers()

      const projectsWithCustomers = demoProjects.map(project => ({
        ...project,
        customer: demoCustomers.find(c => c.id === project.customer_id)
      }))

      setProjects(projectsWithCustomers)
      calculateStats(projectsWithCustomers)
      setLoading(false)
      return
    }

    // 通常モード：Supabaseからデータを取得
    const { data } = await supabase
      .from('projects')
      .select('*, customer:customers(*)')
      .eq('fiscal_year', selectedYear)
      .order('contract_date', { ascending: false })

    if (data) {
      setProjects(data)
      calculateStats(data)
    }

    setLoading(false)
  }

  const calculateStats = (projects: Project[]) => {
    const total = projects.length
    if (total === 0) {
      setStats({
        totalProjects: 0,
        solarPanelCount: 0,
        solarPanelPercentage: 0,
        avgSolarKw: 0,
        batteryCount: 0,
        batteryPercentage: 0,
        belsCount: 0,
        belsPercentage: 0,
        avgPrimaryEnergy1: 0,
        avgPrimaryEnergy2: 0,
        avgPrimaryEnergy3: 0,
        avgUaValue: 0,
        minUaValue: 0,
        maxUaValue: 0,
        avgCValue: 0,
        minCValue: 0,
        maxCValue: 0
      })
      return
    }

    // 太陽光パネル
    const solarPanelCount = projects.filter(p => p.solar_panel).length
    const solarPanelPercentage = (solarPanelCount / total) * 100

    // 太陽光kW数平均
    const solarProjects = projects.filter(p => p.solar_kw && p.solar_kw > 0)
    const avgSolarKw = solarProjects.length > 0
      ? solarProjects.reduce((sum, p) => sum + (p.solar_kw || 0), 0) / solarProjects.length
      : 0

    // 蓄電池
    const batteryCount = projects.filter(p => p.battery).length
    const batteryPercentage = (batteryCount / total) * 100

    // BELS
    const belsCount = projects.filter(p => p.bels).length
    const belsPercentage = (belsCount / total) * 100

    // 一次消費エネルギー
    const energy1Projects = projects.filter(p => p.primary_energy_1 && p.primary_energy_1 > 0)
    const avgPrimaryEnergy1 = energy1Projects.length > 0
      ? energy1Projects.reduce((sum, p) => sum + (p.primary_energy_1 || 0), 0) / energy1Projects.length
      : 0

    const energy2Projects = projects.filter(p => p.primary_energy_2 && p.primary_energy_2 > 0)
    const avgPrimaryEnergy2 = energy2Projects.length > 0
      ? energy2Projects.reduce((sum, p) => sum + (p.primary_energy_2 || 0), 0) / energy2Projects.length
      : 0

    const energy3Projects = projects.filter(p => p.primary_energy_3 && p.primary_energy_3 > 0)
    const avgPrimaryEnergy3 = energy3Projects.length > 0
      ? energy3Projects.reduce((sum, p) => sum + (p.primary_energy_3 || 0), 0) / energy3Projects.length
      : 0

    // UA値
    const uaProjects = projects.filter(p => p.ua_value && p.ua_value > 0)
    const avgUaValue = uaProjects.length > 0
      ? uaProjects.reduce((sum, p) => sum + (p.ua_value || 0), 0) / uaProjects.length
      : 0
    const minUaValue = uaProjects.length > 0
      ? Math.min(...uaProjects.map(p => p.ua_value || 0))
      : 0
    const maxUaValue = uaProjects.length > 0
      ? Math.max(...uaProjects.map(p => p.ua_value || 0))
      : 0

    // C値
    const cProjects = projects.filter(p => p.c_value && p.c_value > 0)
    const avgCValue = cProjects.length > 0
      ? cProjects.reduce((sum, p) => sum + (p.c_value || 0), 0) / cProjects.length
      : 0
    const minCValue = cProjects.length > 0
      ? Math.min(...cProjects.map(p => p.c_value || 0))
      : 0
    const maxCValue = cProjects.length > 0
      ? Math.max(...cProjects.map(p => p.c_value || 0))
      : 0

    setStats({
      totalProjects: total,
      solarPanelCount,
      solarPanelPercentage,
      avgSolarKw,
      batteryCount,
      batteryPercentage,
      belsCount,
      belsPercentage,
      avgPrimaryEnergy1,
      avgPrimaryEnergy2,
      avgPrimaryEnergy3,
      avgUaValue,
      minUaValue,
      maxUaValue,
      avgCValue,
      minCValue,
      maxCValue
    })
  }

  const exportCSV = () => {
    const csvData = projects.map(project => ({
      '案件名': project.customer?.names?.[0] ? `${project.customer.names[0]}様邸` : '不明',
      '太陽光有無': project.solar_panel ? '有' : '無',
      '太陽光kW数': project.solar_kw || '-',
      '蓄電池有無': project.battery ? '有' : '無',
      'UA値': project.ua_value || '-',
      'BELS有無': project.bels ? '有' : '無',
      '一次消費エネルギー①': project.primary_energy_1 || '-',
      '一次消費エネルギー②': project.primary_energy_2 || '-',
      '一次消費エネルギー③': project.primary_energy_3 || '-',
      'C値': project.c_value || '-'
    }))

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `性能管理_${selectedYear}年度.csv`
    link.click()
  }

  const exportPDF = () => {
    const doc = new jsPDF('landscape')
    doc.setFont('helvetica')
    doc.setFontSize(16)
    doc.text(`性能管理 ${selectedYear}年度`, 20, 20)

    let y = 40
    doc.setFontSize(10)
    doc.text('案件', 20, y)
    doc.text('太陽光', 60, y)
    doc.text('kW数', 85, y)
    doc.text('蓄電池', 110, y)
    doc.text('UA値', 135, y)
    doc.text('BELS', 160, y)
    doc.text('1次①', 185, y)
    doc.text('1次②', 210, y)
    doc.text('1次③', 235, y)
    doc.text('C値', 260, y)

    y += 10
    projects.forEach(project => {
      if (y > 180) {
        doc.addPage()
        y = 20
      }

      doc.text((project.customer?.names?.[0] || '不明').substring(0, 10), 20, y)
      doc.text(project.solar_panel ? '有' : '無', 60, y)
      doc.text(project.solar_kw ? project.solar_kw.toString() : '-', 85, y)
      doc.text(project.battery ? '有' : '無', 110, y)
      doc.text(project.ua_value ? project.ua_value.toFixed(3) : '-', 135, y)
      doc.text(project.bels ? '有' : '無', 160, y)
      doc.text(project.primary_energy_1 ? project.primary_energy_1.toFixed(1) : '-', 185, y)
      doc.text(project.primary_energy_2 ? project.primary_energy_2.toFixed(1) : '-', 210, y)
      doc.text(project.primary_energy_3 ? project.primary_energy_3.toFixed(1) : '-', 235, y)
      doc.text(project.c_value ? project.c_value.toFixed(3) : '-', 260, y)
      y += 10
    })

    doc.save(`性能管理_${selectedYear}年度.pdf`)
  }

  if (loading) {
    return (
      <div className="prisma-content">
        <div className="prisma-empty">読み込み中...</div>
      </div>
    )
  }

  return (
    <>
      <div className="prisma-header">
        <h1 className="prisma-header-title">性能管理</h1>
        <div className="prisma-header-actions">
          <button onClick={exportCSV} className="prisma-btn prisma-btn-secondary prisma-btn-sm">
            CSV出力
          </button>
          <button onClick={exportPDF} className="prisma-btn prisma-btn-primary prisma-btn-sm">
            PDF出力
          </button>
        </div>
      </div>

      <div className="prisma-content" style={{ paddingLeft: '24px', paddingRight: '24px' }}>
        {stats && (
          <>
            {/* 統計サマリー */}
            <div className="prisma-card">
              <h2 className="prisma-card-title">統計サマリー</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <div className="prisma-text-sm prisma-text-secondary">太陽光パネル採用率</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{stats.solarPanelPercentage.toFixed(1)}%</div>
                  <div className="prisma-text-xs prisma-text-secondary">（{stats.solarPanelCount}/{stats.totalProjects}件）</div>
                </div>
                <div>
                  <div className="prisma-text-sm prisma-text-secondary">平均太陽光kW数</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{stats.avgSolarKw.toFixed(2)}kW</div>
                </div>
                <div>
                  <div className="prisma-text-sm prisma-text-secondary">蓄電池採用率</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{stats.batteryPercentage.toFixed(1)}%</div>
                  <div className="prisma-text-xs prisma-text-secondary">（{stats.batteryCount}/{stats.totalProjects}件）</div>
                </div>
                <div>
                  <div className="prisma-text-sm prisma-text-secondary">BELS採用率</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{stats.belsPercentage.toFixed(1)}%</div>
                  <div className="prisma-text-xs prisma-text-secondary">（{stats.belsCount}/{stats.totalProjects}件）</div>
                </div>
                <div>
                  <div className="prisma-text-sm prisma-text-secondary">平均UA値</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{stats.avgUaValue.toFixed(3)}</div>
                  <div className="prisma-text-xs prisma-text-secondary">
                    最小: {stats.minUaValue.toFixed(3)} / 最大: {stats.maxUaValue.toFixed(3)}
                  </div>
                </div>
                <div>
                  <div className="prisma-text-sm prisma-text-secondary">平均C値</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{stats.avgCValue.toFixed(3)}</div>
                  <div className="prisma-text-xs prisma-text-secondary">
                    最小: {stats.minCValue.toFixed(3)} / 最大: {stats.maxCValue.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>

            {/* 詳細テーブル */}
            <div className="prisma-card">
              <h2 className="prisma-card-title">案件別詳細</h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="prisma-table">
                  <thead>
                    <tr>
                      <th>案件名</th>
                      <th style={{ textAlign: 'center' }}>太陽光</th>
                      <th style={{ textAlign: 'right' }}>kW数</th>
                      <th style={{ textAlign: 'center' }}>蓄電池</th>
                      <th style={{ textAlign: 'right' }}>UA値</th>
                      <th style={{ textAlign: 'center' }}>BELS</th>
                      <th style={{ textAlign: 'right' }}>1次①</th>
                      <th style={{ textAlign: 'right' }}>1次②</th>
                      <th style={{ textAlign: 'right' }}>1次③</th>
                      <th style={{ textAlign: 'right' }}>C値</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(project => (
                      <tr key={project.id}>
                        <td>
                          {project.customer?.names?.[0] || '不明'}様邸
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {project.solar_panel ? <span className="prisma-badge prisma-badge-green">有</span> : <span className="prisma-badge prisma-badge-gray">無</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {project.solar_kw ? `${project.solar_kw}kW` : '-'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {project.battery ? <span className="prisma-badge prisma-badge-green">有</span> : <span className="prisma-badge prisma-badge-gray">無</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {project.ua_value ? project.ua_value.toFixed(3) : '-'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {project.bels ? <span className="prisma-badge prisma-badge-green">有</span> : <span className="prisma-badge prisma-badge-gray">無</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {project.primary_energy_1 ? project.primary_energy_1.toFixed(1) : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {project.primary_energy_2 ? project.primary_energy_2.toFixed(1) : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {project.primary_energy_3 ? project.primary_energy_3.toFixed(1) : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {project.c_value ? project.c_value.toFixed(3) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
                      <td>平均</td>
                      <td style={{ textAlign: 'center' }}>-</td>
                      <td style={{ textAlign: 'right' }}>{stats.avgSolarKw.toFixed(2)}kW</td>
                      <td style={{ textAlign: 'center' }}>-</td>
                      <td style={{ textAlign: 'right' }}>{stats.avgUaValue.toFixed(3)}</td>
                      <td style={{ textAlign: 'center' }}>-</td>
                      <td style={{ textAlign: 'right' }}>{stats.avgPrimaryEnergy1.toFixed(1)}</td>
                      <td style={{ textAlign: 'right' }}>{stats.avgPrimaryEnergy2.toFixed(1)}</td>
                      <td style={{ textAlign: 'right' }}>{stats.avgPrimaryEnergy3.toFixed(1)}</td>
                      <td style={{ textAlign: 'right' }}>{stats.avgCValue.toFixed(3)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
