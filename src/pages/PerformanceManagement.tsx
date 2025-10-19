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

interface PerformanceStats {
  totalProjects: number
  solarPanelCount: number
  solarPanelPercentage: number
  avgSolarKw: number
  batteryCount: number
  batteryPercentage: number
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
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [selectedYear, mode])

  const loadProjects = async () => {
    setLoading(true)

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
      avgUaValue,
      minUaValue,
      maxUaValue,
      avgCValue,
      minCValue,
      maxCValue
    })
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
      </div>

      <div className="prisma-content">
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
                  <div className="prisma-text-sm prisma-text-secondary">平均UA値</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{stats.avgUaValue.toFixed(3)}</div>
                  <div className="prisma-text-xs prisma-text-secondary">
                    最小: {stats.minUaValue.toFixed(3)} / 最大: {stats.maxUaValue.toFixed(3)}
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
