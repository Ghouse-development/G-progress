/**
 * 性能管理ページ
 *
 * 太陽光・蓄電池・UA値・C値などの性能データを表示
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Project } from '../types/database'
import { useFilter } from '../contexts/FilterContext'
import { useSettings } from '../contexts/SettingsContext'
import { useSimplePermissions } from '../hooks/usePermissions'
import { useToast } from '../contexts/ToastContext'
import { generateDemoProjects, generateDemoCustomers } from '../utils/demoData'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { JAPANESE_TABLE_STYLES } from '../utils/pdfJapaneseFont'

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
  const { selectedFiscalYear, viewMode } = useFilter()
  const { demoMode } = useSettings()
  const { canWrite } = useSimplePermissions()
  const toast = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Map viewMode to old mode format for demo data compatibility
  const legacyMode = viewMode === 'personal' ? 'my_tasks' : viewMode === 'branch' ? 'branch' : 'admin'

  useEffect(() => {
    loadProjects()
  }, [selectedFiscalYear, viewMode, demoMode])

  const loadProjects = async () => {
    setLoading(true)

    if (demoMode) {
      // デモモード：サンプルデータを使用（モード別にデータ件数を調整）
      const demoProjects = generateDemoProjects(legacyMode)
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
    const { data, error } = await supabase
      .from('projects')
      .select('*, customer:customers(*)')
      .eq('fiscal_year', selectedFiscalYear)
      .order('contract_date', { ascending: false })

    if (error) {
      console.error('プロジェクトデータ読み込みエラー:', error)
      toast.error('プロジェクトデータの読み込みに失敗しました')
      setLoading(false)
      return
    }

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
    try {
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
      link.download = `性能管理_${selectedFiscalYear}年度.csv`
      link.click()
    } catch (error) {
      console.error('CSV出力エラー:', error)
      toast.error('CSV出力に失敗しました')
    }
  }

  const exportPDF = () => {
    try {
      const doc = new jsPDF('landscape')

    // タイトル（日本語対応）
    doc.setFontSize(16)
    doc.text(`性能管理 ${selectedFiscalYear}年度`, 20, 20)

    // autoTableを使用してテーブルを作成（日本語ヘッダー）
    autoTable(doc, {
      startY: 30,
      head: [['案件名', '太陽光', 'kW数', '蓄電池', 'UA値', 'BELS', '一次①', '一次②', '一次③', 'C値']],
      body: projects.map(project => [
        project.customer?.names?.[0] || '不明',
        project.solar_panel ? '有' : '無',
        project.solar_kw?.toString() || '-',
        project.battery ? '有' : '無',
        project.ua_value?.toFixed(3) || '-',
        project.bels ? '有' : '無',
        project.primary_energy_1?.toFixed(1) || '-',
        project.primary_energy_2?.toFixed(1) || '-',
        project.primary_energy_3?.toFixed(1) || '-',
        project.c_value?.toFixed(3) || '-'
      ]),
      ...JAPANESE_TABLE_STYLES,
      styles: {
        ...JAPANESE_TABLE_STYLES.styles,
        fontSize: 9
      }
    })

      doc.save(`性能管理_${selectedFiscalYear}年度.pdf`)
    } catch (error) {
      console.error('PDF出力エラー:', error)
      toast.error('PDF出力に失敗しました')
    }
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
          <button onClick={exportCSV} disabled={!canWrite} className="prisma-btn prisma-btn-secondary prisma-btn-sm" title={!canWrite ? '権限がありません' : ''}>
            CSV出力
          </button>
          <button onClick={exportPDF} disabled={!canWrite} className="prisma-btn prisma-btn-primary prisma-btn-sm" title={!canWrite ? '権限がありません' : ''}>
            PDF出力
          </button>
        </div>
      </div>

      <div className="prisma-content px-6">
        {stats && (
          <>
            {/* 統計サマリー */}
            <div className="prisma-card">
              <h2 className="prisma-card-title">統計サマリー</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                <div>
                  <div className="prisma-text-base prisma-text-secondary">太陽光パネル採用率</div>
                  <div className="text-3xl font-bold mt-1">{stats.solarPanelPercentage.toFixed(1)}%</div>
                  <div className="prisma-text-xs prisma-text-secondary">（{stats.solarPanelCount}/{stats.totalProjects}件）</div>
                </div>
                <div>
                  <div className="prisma-text-base prisma-text-secondary">平均太陽光kW数</div>
                  <div className="text-3xl font-bold mt-1">{stats.avgSolarKw.toFixed(2)}kW</div>
                </div>
                <div>
                  <div className="prisma-text-base prisma-text-secondary">蓄電池採用率</div>
                  <div className="text-3xl font-bold mt-1">{stats.batteryPercentage.toFixed(1)}%</div>
                  <div className="prisma-text-xs prisma-text-secondary">（{stats.batteryCount}/{stats.totalProjects}件）</div>
                </div>
                <div>
                  <div className="prisma-text-base prisma-text-secondary">BELS採用率</div>
                  <div className="text-3xl font-bold mt-1">{stats.belsPercentage.toFixed(1)}%</div>
                  <div className="prisma-text-xs prisma-text-secondary">（{stats.belsCount}/{stats.totalProjects}件）</div>
                </div>
                <div>
                  <div className="prisma-text-base prisma-text-secondary">平均UA値</div>
                  <div className="text-3xl font-bold mt-1">{stats.avgUaValue.toFixed(3)}</div>
                  <div className="prisma-text-xs prisma-text-secondary">
                    最小: {stats.minUaValue.toFixed(3)} / 最大: {stats.maxUaValue.toFixed(3)}
                  </div>
                </div>
                <div>
                  <div className="prisma-text-base prisma-text-secondary">平均C値</div>
                  <div className="text-3xl font-bold mt-1">{stats.avgCValue.toFixed(3)}</div>
                  <div className="prisma-text-xs prisma-text-secondary">
                    最小: {stats.minCValue.toFixed(3)} / 最大: {stats.maxCValue.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>

            {/* 詳細テーブル */}
            <div className="prisma-card">
              <h2 className="prisma-card-title">案件別詳細</h2>
              <div className="overflow-x-auto">
                <table className="prisma-table">
                  <thead>
                    <tr>
                      <th>案件名</th>
                      <th>
                        <div className="text-center">太陽光</div>
                      </th>
                      <th>
                        <div className="text-center">kW数</div>
                      </th>
                      <th>
                        <div className="text-center">蓄電池</div>
                      </th>
                      <th>
                        <div className="text-center">UA値</div>
                      </th>
                      <th>
                        <div className="text-center">BELS</div>
                      </th>
                      <th>
                        <div className="text-center">1次①</div>
                      </th>
                      <th>
                        <div className="text-center">1次②</div>
                      </th>
                      <th>
                        <div className="text-center">1次③</div>
                      </th>
                      <th>
                        <div className="text-center">C値</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(project => (
                      <tr key={project.id}>
                        <td>
                          {project.customer?.names?.[0] || '不明'}様邸
                        </td>
                        <td className="text-center">
                          {project.solar_panel ? <span className="prisma-badge prisma-badge-green">有</span> : <span className="prisma-badge prisma-badge-gray">無</span>}
                        </td>
                        <td>
                          <div className="text-center">{project.solar_kw ? `${project.solar_kw}kW` : '-'}</div>
                        </td>
                        <td className="text-center">
                          {project.battery ? <span className="prisma-badge prisma-badge-green">有</span> : <span className="prisma-badge prisma-badge-gray">無</span>}
                        </td>
                        <td>
                          <div className="text-center">{project.ua_value ? project.ua_value.toFixed(3) : '-'}</div>
                        </td>
                        <td className="text-center">
                          {project.bels ? <span className="prisma-badge prisma-badge-green">有</span> : <span className="prisma-badge prisma-badge-gray">無</span>}
                        </td>
                        <td>
                          <div className="text-center">{project.primary_energy_1 ? project.primary_energy_1.toFixed(1) : '-'}</div>
                        </td>
                        <td>
                          <div className="text-center">{project.primary_energy_2 ? project.primary_energy_2.toFixed(1) : '-'}</div>
                        </td>
                        <td>
                          <div className="text-center">{project.primary_energy_3 ? project.primary_energy_3.toFixed(1) : '-'}</div>
                        </td>
                        <td>
                          <div className="text-center">{project.c_value ? project.c_value.toFixed(3) : '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
                      <td>平均</td>
                      <td className="text-center">-</td>
                      <td>
                        <div className="text-center">{stats.avgSolarKw.toFixed(2)}kW</div>
                      </td>
                      <td className="text-center">-</td>
                      <td>
                        <div className="text-center">{stats.avgUaValue.toFixed(3)}</div>
                      </td>
                      <td className="text-center">-</td>
                      <td>
                        <div className="text-center">{stats.avgPrimaryEnergy1.toFixed(1)}</div>
                      </td>
                      <td>
                        <div className="text-center">{stats.avgPrimaryEnergy2.toFixed(1)}</div>
                      </td>
                      <td>
                        <div className="text-center">{stats.avgPrimaryEnergy3.toFixed(1)}</div>
                      </td>
                      <td>
                        <div className="text-center">{stats.avgCValue.toFixed(3)}</div>
                      </td>
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
