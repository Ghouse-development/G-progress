/**
 * 組織階層定義
 * 部署 → 職種の階層構造
 */

export interface DepartmentHierarchy {
  name: string
  positions: string[]
}

/**
 * 組織階層構造
 * 営業部、設計部、工事部、外構事業部
 */
export const ORGANIZATION_HIERARCHY: DepartmentHierarchy[] = [
  {
    name: '営業部',
    positions: ['営業', '営業事務', 'ローン事務', 'その他']
  },
  {
    name: '設計部',
    positions: ['意匠設計', '申請設計', '構造設計', '実施設計', 'IC', 'その他']
  },
  {
    name: '工事部',
    positions: ['工事', '工事事務', '発注・積算', 'その他']
  },
  {
    name: '外構事業部',
    positions: ['プランナー', '外構工事', 'その他']
  }
]

/**
 * すべての職種をフラットなリストで取得
 */
export const getAllPositions = (): string[] => {
  return ORGANIZATION_HIERARCHY.flatMap(dept => dept.positions)
}

/**
 * 職種からグループ化されたオプションを取得（selectのoptgroup用）
 */
export const getPositionOptionGroups = () => {
  return ORGANIZATION_HIERARCHY.map(dept => ({
    label: dept.name,
    options: dept.positions.map(pos => ({
      value: pos,
      label: pos
    }))
  }))
}

/**
 * 職種から部署名を取得
 */
export const getDepartmentByPosition = (position: string): string | undefined => {
  const dept = ORGANIZATION_HIERARCHY.find(d => d.positions.includes(position))
  return dept?.name
}
