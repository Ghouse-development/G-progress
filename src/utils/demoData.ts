/**
 * デモモード用のサンプルデータ生成
 * プレゼンテーション用に豊富なデータを用意
 * モードに応じてデータ件数を調整
 */

import { Project, Task, Payment, Customer, Employee, Product, AuditLog } from '../types/database'
import { addDays, subDays, subHours, subMinutes, format } from 'date-fns'

type Mode = 'my_tasks' | 'branch' | 'admin'

// サンプル商品データ
export const generateDemoProducts = (): Product[] => {
  return [
    { id: 'demo-product-1', name: 'LIFE', category: '注文住宅', description: 'スタンダードな高性能住宅プラン', is_active: true, display_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-product-2', name: 'LIFE+', category: '注文住宅', description: 'LIFEのアップグレード版', is_active: true, display_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-product-3', name: 'HOURS', category: '企画住宅', description: '時間を楽しむ住まい', is_active: true, display_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-product-4', name: 'LACIE', category: '企画住宅', description: 'デザイン性重視プラン', is_active: true, display_order: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-product-5', name: 'LIFE X', category: '注文住宅', description: 'LIFE究極進化版', is_active: true, display_order: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-product-6', name: 'LIFE Limited', category: '注文住宅', description: 'LIFE限定仕様', is_active: true, display_order: 6, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-product-7', name: 'LIFE+ Limited', category: '注文住宅', description: 'LIFE+限定仕様', is_active: true, display_order: 7, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ]
}

// サンプル顧客データ（10名に拡大）
export const generateDemoCustomers = (): Customer[] => {
  return [
    { id: 'demo-customer-1', names: ['山田太郎', '山田花子'], building_site: '東京都渋谷区神宮前1-1-1', phone: '03-1234-5678', email: 'yamada@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-customer-2', names: ['佐藤次郎'], building_site: '東京都新宿区新宿2-2-2', phone: '03-2345-6789', email: 'sato@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-customer-3', names: ['鈴木一郎', '鈴木美咲'], building_site: '神奈川県横浜市港北区3-3-3', phone: '045-3456-7890', email: 'suzuki@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-customer-4', names: ['田中健太'], building_site: '埼玉県さいたま市大宮区4-4-4', phone: '048-4567-8901', email: 'tanaka@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-customer-5', names: ['高橋誠', '高橋由美'], building_site: '千葉県船橋市本町5-5-5', phone: '047-5678-9012', email: 'takahashi@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-customer-6', names: ['伊藤孝'], building_site: '東京都世田谷区成城6-6-6', phone: '03-6789-0123', email: 'ito@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-customer-7', names: ['渡辺直樹', '渡辺恵子'], building_site: '神奈川県川崎市中原区7-7-7', phone: '044-7890-1234', email: 'watanabe@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-customer-8', names: ['中村拓也'], building_site: '埼玉県川口市栄町8-8-8', phone: '048-8901-2345', email: 'nakamura@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-customer-9', names: ['小林亮太', '小林麻衣'], building_site: '千葉県柏市若葉町9-9-9', phone: '04-7012-3456', email: 'kobayashi@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-customer-10', names: ['加藤剛'], building_site: '東京都目黒区自由が丘10-10-10', phone: '03-3456-7890', email: 'kato@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ]
}

// サンプル従業員データ
export const generateDemoEmployees = (): Employee[] => {
  return [
    { id: 'demo-emp-1', email: 'sales1@ghouse.com', last_name: '営業', first_name: '太郎', department: '営業', role: 'member', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-emp-2', email: 'design1@ghouse.com', last_name: '設計', first_name: '次郎', department: '意匠設計', role: 'member', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-emp-3', email: 'construction1@ghouse.com', last_name: '工事', first_name: '三郎', department: '工事', role: 'member', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ]
}

// サンプルプロジェクトデータ（10件、モードで絞り込み可能）
export const generateDemoProjects = (mode: Mode = 'admin'): Project[] => {
  const baseDate = new Date()
  const customers = generateDemoCustomers()
  const employees = generateDemoEmployees()

  const allProjects: Project[] = [
    { id: 'demo-project-1', customer_id: customers[0].id, contract_number: 'K2025-001', contract_date: format(addDays(baseDate, -150), 'yyyy-MM-dd'), floor_plan_confirmed_date: format(addDays(baseDate, -135), 'yyyy-MM-dd'), final_specification_meeting_date: format(addDays(baseDate, -120), 'yyyy-MM-dd'), construction_permission_date: format(addDays(baseDate, -100), 'yyyy-MM-dd'), construction_start_date: format(addDays(baseDate, -80), 'yyyy-MM-dd'), roof_raising_date: format(addDays(baseDate, -45), 'yyyy-MM-dd'), completion_inspection_date: format(addDays(baseDate, -10), 'yyyy-MM-dd'), handover_date: format(addDays(baseDate, -2), 'yyyy-MM-dd'), status: 'completed', progress_rate: 100, assigned_sales: employees[0].id, assigned_design: employees[1].id, assigned_construction: employees[2].id, fiscal_year: '2025', contract_amount: 32000000, gross_profit: 6400000, total_floor_area: 35.5, solar_panel: true, solar_kw: 5.5, battery: true, ua_value: 0.46, bels: true, primary_energy_1: 45.2, primary_energy_2: 48.5, primary_energy_3: 52.0, c_value: 0.5, product_type: 'スタンダードプラン', exclude_from_count: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-project-2', customer_id: customers[1].id, contract_number: 'K2025-002', contract_date: format(addDays(baseDate, -120), 'yyyy-MM-dd'), floor_plan_confirmed_date: format(addDays(baseDate, -105), 'yyyy-MM-dd'), construction_permission_date: format(addDays(baseDate, -80), 'yyyy-MM-dd'), construction_start_date: format(addDays(baseDate, -60), 'yyyy-MM-dd'), roof_raising_date: format(addDays(baseDate, -25), 'yyyy-MM-dd'), status: 'construction', progress_rate: 70, assigned_sales: employees[0].id, assigned_design: employees[1].id, assigned_construction: employees[2].id, fiscal_year: '2025', contract_amount: 28000000, gross_profit: 5600000, total_floor_area: 32.0, solar_panel: false, battery: false, ua_value: 0.52, bels: false, primary_energy_1: 58.3, primary_energy_2: 61.2, primary_energy_3: 65.0, c_value: 0.6, product_type: 'エコノミープラン', exclude_from_count: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-project-3', customer_id: customers[2].id, contract_number: 'K2025-003', contract_date: format(addDays(baseDate, -90), 'yyyy-MM-dd'), floor_plan_confirmed_date: format(addDays(baseDate, -75), 'yyyy-MM-dd'), construction_permission_date: format(addDays(baseDate, -50), 'yyyy-MM-dd'), construction_start_date: format(addDays(baseDate, -30), 'yyyy-MM-dd'), status: 'construction', progress_rate: 40, assigned_sales: employees[0].id, assigned_design: employees[1].id, assigned_construction: employees[2].id, fiscal_year: '2025', contract_amount: 38000000, gross_profit: 7600000, total_floor_area: 40.0, solar_panel: true, solar_kw: 6.5, battery: true, ua_value: 0.42, bels: true, primary_energy_1: 40.8, primary_energy_2: 43.2, primary_energy_3: 46.5, c_value: 0.4, product_type: 'プレミアムプラン', exclude_from_count: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-project-4', customer_id: customers[3].id, contract_number: 'K2025-004', contract_date: format(addDays(baseDate, -70), 'yyyy-MM-dd'), floor_plan_confirmed_date: format(addDays(baseDate, -60), 'yyyy-MM-dd'), construction_permission_date: format(addDays(baseDate, -40), 'yyyy-MM-dd'), status: 'post_contract', progress_rate: 25, assigned_sales: employees[0].id, assigned_design: employees[1].id, assigned_construction: employees[2].id, fiscal_year: '2025', contract_amount: 25000000, gross_profit: 5000000, total_floor_area: 28.5, solar_panel: false, battery: false, ua_value: 0.55, bels: false, primary_energy_1: 62.5, primary_energy_2: 65.8, primary_energy_3: 68.0, c_value: 0.7, product_type: 'コンパクトプラン', exclude_from_count: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-project-5', customer_id: customers[4].id, contract_number: 'K2025-005', contract_date: format(addDays(baseDate, -50), 'yyyy-MM-dd'), floor_plan_confirmed_date: format(addDays(baseDate, -35), 'yyyy-MM-dd'), status: 'post_contract', progress_rate: 15, assigned_sales: employees[0].id, assigned_design: employees[1].id, fiscal_year: '2025', contract_amount: 35000000, gross_profit: 7000000, total_floor_area: 38.0, solar_panel: true, solar_kw: 6.0, battery: false, ua_value: 0.48, bels: true, primary_energy_1: 47.5, primary_energy_2: 50.2, primary_energy_3: 53.8, c_value: 0.55, product_type: 'スタンダードプラン', exclude_from_count: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-project-6', customer_id: customers[5].id, contract_number: 'K2025-006', contract_date: format(addDays(baseDate, -30), 'yyyy-MM-dd'), floor_plan_confirmed_date: format(addDays(baseDate, -20), 'yyyy-MM-dd'), status: 'post_contract', progress_rate: 10, assigned_sales: employees[0].id, assigned_design: employees[1].id, fiscal_year: '2025', contract_amount: 42000000, gross_profit: 8400000, total_floor_area: 45.0, solar_panel: true, solar_kw: 7.0, battery: true, ua_value: 0.40, bels: true, primary_energy_1: 38.5, primary_energy_2: 41.0, primary_energy_3: 44.2, c_value: 0.35, product_type: 'プレミアムプラン', exclude_from_count: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-project-7', customer_id: customers[6].id, contract_number: 'K2025-007', contract_date: format(addDays(baseDate, -20), 'yyyy-MM-dd'), status: 'post_contract', progress_rate: 5, assigned_sales: employees[0].id, fiscal_year: '2025', contract_amount: 29000000, gross_profit: 5800000, total_floor_area: 33.0, solar_panel: false, battery: false, ua_value: 0.53, bels: false, primary_energy_1: 60.2, primary_energy_2: 63.5, primary_energy_3: 66.8, c_value: 0.65, product_type: 'スタンダードプラン', exclude_from_count: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-project-8', customer_id: customers[7].id, contract_number: 'K2025-008', contract_date: format(addDays(baseDate, -10), 'yyyy-MM-dd'), status: 'post_contract', progress_rate: 3, assigned_sales: employees[0].id, fiscal_year: '2025', contract_amount: 27000000, gross_profit: 5400000, total_floor_area: 30.0, solar_panel: true, solar_kw: 5.0, battery: false, ua_value: 0.50, c_value: 0.60, product_type: 'エコノミープラン', exclude_from_count: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-project-9', customer_id: customers[8].id, contract_number: 'K2025-009', contract_date: format(addDays(baseDate, -5), 'yyyy-MM-dd'), status: 'post_contract', progress_rate: 1, assigned_sales: employees[0].id, fiscal_year: '2025', contract_amount: 36000000, gross_profit: 7200000, total_floor_area: 39.0, solar_panel: true, solar_kw: 6.2, battery: true, ua_value: 0.45, c_value: 0.50, product_type: 'スタンダードプラン', exclude_from_count: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-project-10', customer_id: customers[9].id, contract_number: 'K2025-010', contract_date: format(addDays(baseDate, -2), 'yyyy-MM-dd'), status: 'post_contract', progress_rate: 1, assigned_sales: employees[0].id, fiscal_year: '2025', contract_amount: 31000000, gross_profit: 6200000, total_floor_area: 34.0, solar_panel: false, battery: false, ua_value: 0.51, c_value: 0.62, product_type: 'コンパクトプラン', exclude_from_count: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ]

  // モード別にプロジェクト数を調整
  if (mode === 'my_tasks') {
    // 担当者モード: 2-3件のみ（自分が担当している案件）
    return allProjects.slice(0, 3)
  } else if (mode === 'branch') {
    // 拠点モード: 6件（自分の拠点の案件）
    return allProjects.slice(0, 6)
  } else {
    // 全社モード: 全10件
    return allProjects
  }
}

// 豊富なサンプルタスクデータ（35個以上、モードで絞り込み）
export const generateDemoTasks = (mode: Mode = 'admin'): Task[] => {
  const baseDate = new Date()
  const validProjectIds = mode === 'my_tasks'
    ? ['demo-project-1', 'demo-project-2', 'demo-project-3']
    : mode === 'branch'
    ? ['demo-project-1', 'demo-project-2', 'demo-project-3', 'demo-project-4', 'demo-project-5', 'demo-project-6']
    : null // adminは全件

  const allTasks: Task[] = [
    // プロジェクト1（完成）- 10タスク
    { id: 'demo-task-1-1', project_id: 'demo-project-1', title: '契約書作成', description: '営業事務: 請負契約書作成', assigned_to: 'demo-emp-1', due_date: format(addDays(baseDate, -148), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -148), 'yyyy-MM-dd'), status: 'completed', priority: 'high', dos: '印紙準備・顧客確認', donts: '内容変更時は必ず同意取得', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-1-2', project_id: 'demo-project-1', title: 'ローン仮審査', description: 'ローン事務: 住宅ローン仮審査申込', assigned_to: 'demo-emp-1', due_date: format(addDays(baseDate, -145), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -146), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-1-3', project_id: 'demo-project-1', title: '意匠設計', description: '意匠設計: プラン確定', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -135), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -136), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-1-4', project_id: 'demo-project-1', title: 'IC実施', description: 'IC: インテリアコーディネート', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -125), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -125), 'yyyy-MM-dd'), status: 'completed', priority: 'medium', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-1-5', project_id: 'demo-project-1', title: '実施設計', description: '実施設計: 詳細図面作成', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -115), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -116), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-1-6', project_id: 'demo-project-1', title: '確認申請', description: '申請設計: 建築確認申請', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -100), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -101), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-1-7', project_id: 'demo-project-1', title: '地盤調査', description: '工事: 地盤調査実施', assigned_to: 'demo-emp-3', due_date: format(addDays(baseDate, -85), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -86), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-1-8', project_id: 'demo-project-1', title: '基礎工事', description: '工事: 基礎施工', assigned_to: 'demo-emp-3', due_date: format(addDays(baseDate, -70), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -71), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-1-9', project_id: 'demo-project-1', title: '上棟', description: '工事: 上棟工事', assigned_to: 'demo-emp-3', due_date: format(addDays(baseDate, -45), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -46), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-1-10', project_id: 'demo-project-1', title: '引き渡し', description: '営業: 物件引き渡し', assigned_to: 'demo-emp-1', due_date: format(addDays(baseDate, -2), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -2), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // プロジェクト2（工事中）- 8タスク
    { id: 'demo-task-2-1', project_id: 'demo-project-2', title: '契約書作成', description: '営業事務: 契約書類準備', assigned_to: 'demo-emp-1', due_date: format(addDays(baseDate, -118), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -118), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-2-2', project_id: 'demo-project-2', title: '意匠設計', description: '意匠設計: プラン作成', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -105), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -106), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-2-3', project_id: 'demo-project-2', title: '構造設計', description: '構造設計: 構造計算', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -95), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -96), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-2-4', project_id: 'demo-project-2', title: '確認申請', description: '申請設計: 建築確認', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -80), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -81), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-2-5', project_id: 'demo-project-2', title: '着工', description: '工事: 着工開始', assigned_to: 'demo-emp-3', due_date: format(addDays(baseDate, -60), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -61), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-2-6', project_id: 'demo-project-2', title: '上棟', description: '工事: 上棟式', assigned_to: 'demo-emp-3', due_date: format(addDays(baseDate, -25), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -26), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-2-7', project_id: 'demo-project-2', title: '外構工事', description: '外構工事: 造園', assigned_to: 'demo-emp-3', due_date: format(addDays(baseDate, 5), 'yyyy-MM-dd'), status: 'requested', priority: 'medium', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-2-8', project_id: 'demo-project-2', title: '完了検査', description: '工事: 完了検査申請', assigned_to: 'demo-emp-3', due_date: format(addDays(baseDate, 15), 'yyyy-MM-dd'), status: 'not_started', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // プロジェクト3（工事中）- 7タスク
    { id: 'demo-task-3-1', project_id: 'demo-project-3', title: '契約手続き', description: '営業事務: 契約締結', assigned_to: 'demo-emp-1', due_date: format(addDays(baseDate, -88), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -88), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-3-2', project_id: 'demo-project-3', title: 'プラン確定', description: '意匠設計: 間取り確定', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -75), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -76), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-3-3', project_id: 'demo-project-3', title: '実施設計', description: '実施設計: 詳細図面', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -60), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -61), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-3-4', project_id: 'demo-project-3', title: '確認申請', description: '申請設計: 確認済証取得', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -50), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -51), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-3-5', project_id: 'demo-project-3', title: '着工', description: '工事: 着工', assigned_to: 'demo-emp-3', due_date: format(addDays(baseDate, -30), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -31), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-3-6', project_id: 'demo-project-3', title: '木工事', description: '工事: 木工事進行中', assigned_to: 'demo-emp-3', due_date: format(addDays(baseDate, 10), 'yyyy-MM-dd'), status: 'requested', priority: 'medium', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-3-7', project_id: 'demo-project-3', title: '設備工事', description: '工事: 設備取付', assigned_to: 'demo-emp-3', due_date: format(addDays(baseDate, 25), 'yyyy-MM-dd'), status: 'not_started', priority: 'medium', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // プロジェクト4（着工前）- 5タスク
    { id: 'demo-task-4-1', project_id: 'demo-project-4', title: '契約締結', description: '営業事務: 契約書作成', assigned_to: 'demo-emp-1', due_date: format(addDays(baseDate, -68), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -68), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-4-2', project_id: 'demo-project-4', title: 'プラン決定', description: '意匠設計: プラン確定', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -60), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -61), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-4-3', project_id: 'demo-project-4', title: '実施設計', description: '実施設計: 図面作成', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -50), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -51), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-4-4', project_id: 'demo-project-4', title: '確認申請', description: '申請設計: 建築確認申請', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -40), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -41), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-4-5', project_id: 'demo-project-4', title: '地盤調査', description: '工事: 地盤調査', assigned_to: 'demo-emp-3', due_date: format(addDays(baseDate, 5), 'yyyy-MM-dd'), status: 'not_started', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // プロジェクト5（設計中）- 5タスク
    { id: 'demo-task-5-1', project_id: 'demo-project-5', title: '契約手続き', description: '営業事務: 契約', assigned_to: 'demo-emp-1', due_date: format(addDays(baseDate, -48), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -48), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-5-2', project_id: 'demo-project-5', title: 'プラン作成', description: '意匠設計: 間取りプラン', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -35), 'yyyy-MM-dd'), actual_completion_date: format(addDays(baseDate, -36), 'yyyy-MM-dd'), status: 'completed', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-5-3', project_id: 'demo-project-5', title: 'IC実施', description: 'IC: コーディネート', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, -20), 'yyyy-MM-dd'), status: 'delayed', priority: 'medium', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-5-4', project_id: 'demo-project-5', title: '実施設計', description: '実施設計: 詳細設計', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, 10), 'yyyy-MM-dd'), status: 'not_started', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-task-5-5', project_id: 'demo-project-5', title: '構造設計', description: '構造設計: 構造計算', assigned_to: 'demo-emp-2', due_date: format(addDays(baseDate, 20), 'yyyy-MM-dd'), status: 'not_started', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ]

  // モード別にフィルタリング
  if (validProjectIds) {
    return allTasks.filter(task => validProjectIds.includes(task.project_id))
  }
  return allTasks
}

// 豊富なサンプル入金データ（30件以上、モードで絞り込み）
export const generateDemoPayments = (mode: Mode = 'admin'): Payment[] => {
  const baseDate = new Date()
  const validProjectIds = mode === 'my_tasks'
    ? ['demo-project-1', 'demo-project-2', 'demo-project-3']
    : mode === 'branch'
    ? ['demo-project-1', 'demo-project-2', 'demo-project-3', 'demo-project-4', 'demo-project-5', 'demo-project-6']
    : null // adminは全件

  const allPayments: Payment[] = [
    // プロジェクト1（完済）- 4件
    { id: 'demo-payment-1-1', project_id: 'demo-project-1', payment_type: '契約金', amount: 3200000, scheduled_date: format(addDays(baseDate, -150), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -150), 'yyyy-MM-dd'), scheduled_amount: 3200000, actual_amount: 3200000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-1-2', project_id: 'demo-project-1', payment_type: '着工金', amount: 9600000, scheduled_date: format(addDays(baseDate, -80), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -80), 'yyyy-MM-dd'), scheduled_amount: 9600000, actual_amount: 9600000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-1-3', project_id: 'demo-project-1', payment_type: '上棟金', amount: 9600000, scheduled_date: format(addDays(baseDate, -45), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -45), 'yyyy-MM-dd'), scheduled_amount: 9600000, actual_amount: 9600000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-1-4', project_id: 'demo-project-1', payment_type: '最終金', amount: 9600000, scheduled_date: format(addDays(baseDate, -2), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -2), 'yyyy-MM-dd'), scheduled_amount: 9600000, actual_amount: 9600000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // プロジェクト2（上棟金まで）- 4件
    { id: 'demo-payment-2-1', project_id: 'demo-project-2', payment_type: '契約金', amount: 2800000, scheduled_date: format(addDays(baseDate, -120), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -120), 'yyyy-MM-dd'), scheduled_amount: 2800000, actual_amount: 2800000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-2-2', project_id: 'demo-project-2', payment_type: '着工金', amount: 8400000, scheduled_date: format(addDays(baseDate, -60), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -60), 'yyyy-MM-dd'), scheduled_amount: 8400000, actual_amount: 8400000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-2-3', project_id: 'demo-project-2', payment_type: '上棟金', amount: 8400000, scheduled_date: format(addDays(baseDate, -25), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -25), 'yyyy-MM-dd'), scheduled_amount: 8400000, actual_amount: 8400000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-2-4', project_id: 'demo-project-2', payment_type: '最終金', amount: 8400000, scheduled_date: format(addDays(baseDate, 20), 'yyyy-MM-dd'), scheduled_amount: 8400000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // プロジェクト3（着工金まで）- 4件
    { id: 'demo-payment-3-1', project_id: 'demo-project-3', payment_type: '契約金', amount: 3800000, scheduled_date: format(addDays(baseDate, -90), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -90), 'yyyy-MM-dd'), scheduled_amount: 3800000, actual_amount: 3800000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-3-2', project_id: 'demo-project-3', payment_type: '着工金', amount: 11400000, scheduled_date: format(addDays(baseDate, -30), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -30), 'yyyy-MM-dd'), scheduled_amount: 11400000, actual_amount: 11400000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-3-3', project_id: 'demo-project-3', payment_type: '上棟金', amount: 11400000, scheduled_date: format(addDays(baseDate, 15), 'yyyy-MM-dd'), scheduled_amount: 11400000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-3-4', project_id: 'demo-project-3', payment_type: '最終金', amount: 11400000, scheduled_date: format(addDays(baseDate, 60), 'yyyy-MM-dd'), scheduled_amount: 11400000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // プロジェクト4（契約金のみ）- 4件
    { id: 'demo-payment-4-1', project_id: 'demo-project-4', payment_type: '契約金', amount: 2500000, scheduled_date: format(addDays(baseDate, -70), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -70), 'yyyy-MM-dd'), scheduled_amount: 2500000, actual_amount: 2500000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-4-2', project_id: 'demo-project-4', payment_type: '着工金', amount: 7500000, scheduled_date: format(addDays(baseDate, 10), 'yyyy-MM-dd'), scheduled_amount: 7500000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-4-3', project_id: 'demo-project-4', payment_type: '上棟金', amount: 7500000, scheduled_date: format(addDays(baseDate, 50), 'yyyy-MM-dd'), scheduled_amount: 7500000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-4-4', project_id: 'demo-project-4', payment_type: '最終金', amount: 7500000, scheduled_date: format(addDays(baseDate, 100), 'yyyy-MM-dd'), scheduled_amount: 7500000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // プロジェクト5（契約金のみ）- 4件
    { id: 'demo-payment-5-1', project_id: 'demo-project-5', payment_type: '契約金', amount: 3500000, scheduled_date: format(addDays(baseDate, -50), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -50), 'yyyy-MM-dd'), scheduled_amount: 3500000, actual_amount: 3500000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-5-2', project_id: 'demo-project-5', payment_type: '着工金', amount: 10500000, scheduled_date: format(addDays(baseDate, 20), 'yyyy-MM-dd'), scheduled_amount: 10500000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-5-3', project_id: 'demo-project-5', payment_type: '上棟金', amount: 10500000, scheduled_date: format(addDays(baseDate, 70), 'yyyy-MM-dd'), scheduled_amount: 10500000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-5-4', project_id: 'demo-project-5', payment_type: '最終金', amount: 10500000, scheduled_date: format(addDays(baseDate, 120), 'yyyy-MM-dd'), scheduled_amount: 10500000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // プロジェクト6～10の入金データ（各4件ずつ）
    { id: 'demo-payment-6-1', project_id: 'demo-project-6', payment_type: '契約金', amount: 4200000, scheduled_date: format(addDays(baseDate, -30), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -30), 'yyyy-MM-dd'), scheduled_amount: 4200000, actual_amount: 4200000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-6-2', project_id: 'demo-project-6', payment_type: '着工金', amount: 12600000, scheduled_date: format(addDays(baseDate, 30), 'yyyy-MM-dd'), scheduled_amount: 12600000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-7-1', project_id: 'demo-project-7', payment_type: '契約金', amount: 2900000, scheduled_date: format(addDays(baseDate, -20), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -20), 'yyyy-MM-dd'), scheduled_amount: 2900000, actual_amount: 2900000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-7-2', project_id: 'demo-project-7', payment_type: '着工金', amount: 8700000, scheduled_date: format(addDays(baseDate, 40), 'yyyy-MM-dd'), scheduled_amount: 8700000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-8-1', project_id: 'demo-project-8', payment_type: '契約金', amount: 2700000, scheduled_date: format(addDays(baseDate, -10), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -10), 'yyyy-MM-dd'), scheduled_amount: 2700000, actual_amount: 2700000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-8-2', project_id: 'demo-project-8', payment_type: '着工金', amount: 8100000, scheduled_date: format(addDays(baseDate, 50), 'yyyy-MM-dd'), scheduled_amount: 8100000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-9-1', project_id: 'demo-project-9', payment_type: '契約金', amount: 3600000, scheduled_date: format(addDays(baseDate, -5), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -5), 'yyyy-MM-dd'), scheduled_amount: 3600000, actual_amount: 3600000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-9-2', project_id: 'demo-project-9', payment_type: '着工金', amount: 10800000, scheduled_date: format(addDays(baseDate, 60), 'yyyy-MM-dd'), scheduled_amount: 10800000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-10-1', project_id: 'demo-project-10', payment_type: '契約金', amount: 3100000, scheduled_date: format(addDays(baseDate, -2), 'yyyy-MM-dd'), actual_date: format(addDays(baseDate, -2), 'yyyy-MM-dd'), scheduled_amount: 3100000, actual_amount: 3100000, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'demo-payment-10-2', project_id: 'demo-project-10', payment_type: '着工金', amount: 9300000, scheduled_date: format(addDays(baseDate, 70), 'yyyy-MM-dd'), scheduled_amount: 9300000, actual_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ]

  // モード別にフィルタリング
  if (validProjectIds) {
    return allPayments.filter(payment => validProjectIds.includes(payment.project_id))
  }
  return allPayments
}

// 豊富なサンプル監査ログデータ（様々なアクションを含む、分かりやすい説明付き）
export const generateDemoAuditLogs = (): AuditLog[] => {
  const baseDate = new Date()
  const employees = generateDemoEmployees()

  return [
    // 最近のログ（過去24時間）
    { id: 'demo-audit-1', user_id: employees[0].id, action: 'update', table_name: 'projects', record_id: 'demo-project-2', changes: { progress_rate: { old: 65, new: 70 }, project_name: '佐藤次郎様邸', description: '進捗率を65%→70%に更新' }, ip_address: '192.168.1.10', created_at: subMinutes(baseDate, 15).toISOString(), user: employees[0] },
    { id: 'demo-audit-2', user_id: employees[1].id, action: 'create', table_name: 'tasks', record_id: 'demo-task-new-1', changes: { project_name: '山田太郎様邸', task_title: '地盤調査', description: 'タスク「地盤調査」を作成' }, ip_address: '192.168.1.11', created_at: subMinutes(baseDate, 45).toISOString(), user: employees[1] },
    { id: 'demo-audit-3', user_id: employees[2].id, action: 'update', table_name: 'tasks', record_id: 'demo-task-2-7', changes: { project_name: '佐藤次郎様邸', task_title: '外構工事', status: { old: 'not_started', new: 'requested' }, description: 'タスク「外構工事」のステータスを未着手→着手中に変更' }, ip_address: '192.168.1.12', created_at: subHours(baseDate, 2).toISOString(), user: employees[2] },
    { id: 'demo-audit-4', user_id: employees[0].id, action: 'login', changes: { description: 'システムにログイン' }, ip_address: '192.168.1.10', created_at: subHours(baseDate, 3).toISOString(), user: employees[0] },
    { id: 'demo-audit-5', user_id: employees[1].id, action: 'update', table_name: 'projects', record_id: 'demo-project-3', changes: { project_name: '鈴木一郎様邸', status: { old: 'post_contract', new: 'construction' }, description: 'ステータスを契約後→工事中に変更' }, ip_address: '192.168.1.11', created_at: subHours(baseDate, 5).toISOString(), user: employees[1] },

    // 過去数日のログ
    { id: 'demo-audit-6', user_id: employees[2].id, action: 'create', table_name: 'payments', record_id: 'demo-payment-new-1', changes: { project_name: '高橋誠様邸', payment_type: '契約金', amount: 3000000, description: '入金「契約金」300万円を登録' }, ip_address: '192.168.1.12', created_at: subDays(baseDate, 1).toISOString(), user: employees[2] },
    { id: 'demo-audit-7', user_id: employees[0].id, action: 'update', table_name: 'customers', record_id: 'demo-customer-1', changes: { customer_name: '山田太郎', phone: { old: '03-1234-5678', new: '03-1234-9999' }, description: '顧客「山田太郎」の電話番号を変更' }, ip_address: '192.168.1.10', created_at: subDays(baseDate, 1).toISOString(), user: employees[0] },
    { id: 'demo-audit-8', user_id: employees[1].id, action: 'delete', table_name: 'tasks', record_id: 'demo-task-old-1', changes: { project_name: '田中健太様邸', task_title: '不要なタスク', description: 'タスク「不要なタスク」を削除' }, ip_address: '192.168.1.11', created_at: subDays(baseDate, 2).toISOString(), user: employees[1] },
    { id: 'demo-audit-9', user_id: employees[2].id, action: 'login', changes: { description: 'システムにログイン' }, ip_address: '192.168.1.12', created_at: subDays(baseDate, 2).toISOString(), user: employees[2] },
    { id: 'demo-audit-10', user_id: employees[0].id, action: 'create', table_name: 'projects', record_id: 'demo-project-10', changes: { project_name: '加藤剛様邸', contract_number: 'K2025-010', description: '案件「加藤剛様邸」を新規作成' }, ip_address: '192.168.1.10', created_at: subDays(baseDate, 2).toISOString(), user: employees[0] },

    // 過去1週間のログ
    { id: 'demo-audit-11', user_id: employees[1].id, action: 'update', table_name: 'tasks', record_id: 'demo-task-1-10', changes: { project_name: '山田太郎様邸', task_title: '引き渡し', status: { old: 'requested', new: 'completed' }, description: 'タスク「引き渡し」のステータスを着手中→完了に変更' }, ip_address: '192.168.1.11', created_at: subDays(baseDate, 3).toISOString(), user: employees[1] },
    { id: 'demo-audit-12', user_id: employees[2].id, action: 'update', table_name: 'payments', record_id: 'demo-payment-1-4', changes: { project_name: '山田太郎様邸', payment_type: '最終金', status: { old: 'pending', new: 'completed' }, description: '入金「最終金」のステータスを未入金→完了に変更' }, ip_address: '192.168.1.12', created_at: subDays(baseDate, 3).toISOString(), user: employees[2] },
    { id: 'demo-audit-13', user_id: employees[0].id, action: 'login', changes: { description: 'システムにログイン' }, ip_address: '192.168.1.10', created_at: subDays(baseDate, 4).toISOString(), user: employees[0] },
    { id: 'demo-audit-14', user_id: employees[1].id, action: 'create', table_name: 'customers', record_id: 'demo-customer-10', changes: { customer_name: '加藤剛', building_site: '東京都目黒区自由が丘10-10-10', description: '顧客「加藤剛」を新規登録' }, ip_address: '192.168.1.11', created_at: subDays(baseDate, 5).toISOString(), user: employees[1] },
    { id: 'demo-audit-15', user_id: employees[2].id, action: 'update', table_name: 'projects', record_id: 'demo-project-1', changes: { project_name: '山田太郎様邸', status: { old: 'construction', new: 'completed' }, description: 'ステータスを工事中→完了に変更' }, ip_address: '192.168.1.12', created_at: subDays(baseDate, 5).toISOString(), user: employees[2] },
    { id: 'demo-audit-16', user_id: employees[0].id, action: 'update', table_name: 'tasks', record_id: 'demo-task-2-6', changes: { project_name: '佐藤次郎様邸', task_title: '上棟', status: { old: 'requested', new: 'completed' }, description: 'タスク「上棟」を完了' }, ip_address: '192.168.1.10', created_at: subDays(baseDate, 6).toISOString(), user: employees[0] },
    { id: 'demo-audit-17', user_id: employees[1].id, action: 'logout', changes: { description: 'ログアウト' }, ip_address: '192.168.1.11', created_at: subDays(baseDate, 6).toISOString(), user: employees[1] },
    { id: 'demo-audit-18', user_id: employees[2].id, action: 'create', table_name: 'tasks', record_id: 'demo-task-3-7', changes: { project_name: '鈴木一郎様邸', task_title: '設備工事', description: 'タスク「設備工事」を新規作成' }, ip_address: '192.168.1.12', created_at: subDays(baseDate, 7).toISOString(), user: employees[2] },
    { id: 'demo-audit-19', user_id: employees[0].id, action: 'update', table_name: 'projects', record_id: 'demo-project-4', changes: { project_name: '田中健太様邸', progress_rate: { old: 20, new: 25 }, description: '進捗率を20%→25%に更新' }, ip_address: '192.168.1.10', created_at: subDays(baseDate, 7).toISOString(), user: employees[0] },
    { id: 'demo-audit-20', user_id: employees[1].id, action: 'login', changes: { description: 'システムにログイン' }, ip_address: '192.168.1.11', created_at: subDays(baseDate, 7).toISOString(), user: employees[1] },

    // 過去2週間のログ
    { id: 'demo-audit-21', user_id: employees[2].id, action: 'delete', table_name: 'payments', record_id: 'demo-payment-old-1', changes: { project_name: '伊藤孝様邸', payment_type: '誤入力', description: '入金「誤入力」を削除' }, ip_address: '192.168.1.12', created_at: subDays(baseDate, 10).toISOString(), user: employees[2] },
    { id: 'demo-audit-22', user_id: employees[0].id, action: 'create', table_name: 'projects', record_id: 'demo-project-9', changes: { project_name: '小林亮太様邸', contract_number: 'K2025-009', description: '案件「小林亮太様邸」を新規作成' }, ip_address: '192.168.1.10', created_at: subDays(baseDate, 12).toISOString(), user: employees[0] },
    { id: 'demo-audit-23', user_id: employees[1].id, action: 'update', table_name: 'customers', record_id: 'demo-customer-8', changes: { customer_name: '中村拓也', email: { old: 'old@example.com', new: 'nakamura@example.com' }, description: '顧客「中村拓也」のメールアドレスを変更' }, ip_address: '192.168.1.11', created_at: subDays(baseDate, 13).toISOString(), user: employees[1] },
    { id: 'demo-audit-24', user_id: employees[2].id, action: 'login', changes: { description: 'システムにログイン' }, ip_address: '192.168.1.12', created_at: subDays(baseDate, 14).toISOString(), user: employees[2] },
    { id: 'demo-audit-25', user_id: employees[0].id, action: 'create', table_name: 'tasks', record_id: 'demo-task-5-5', changes: { project_name: '高橋誠様邸', task_title: '構造設計', description: 'タスク「構造設計」を新規作成' }, ip_address: '192.168.1.10', created_at: subDays(baseDate, 14).toISOString(), user: employees[0] }
  ]
}
