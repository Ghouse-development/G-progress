/**
 * kintone REST API クライアント
 *
 * 使用例:
 * const client = new KintoneClient(domain, apiToken)
 * const records = await client.getRecords(appId)
 * await client.createRecord(appId, record)
 */

export interface KintoneRecord {
  [key: string]: {
    value: any
  }
}

export interface KintoneConfig {
  domain: string
  apiToken: string
  appId: string
}

export class KintoneClient {
  private baseUrl: string
  private apiToken: string

  constructor(domain: string, apiToken: string) {
    this.baseUrl = `https://${domain}`
    this.apiToken = apiToken
  }

  /**
   * 接続テスト
   */
  async testConnection(appId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/k/v1/app.json?id=${appId}`,
        {
          method: 'GET',
          headers: {
            'X-Cybozu-API-Token': this.apiToken
          }
        }
      )

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || '接続に失敗しました' }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '接続に失敗しました' }
    }
  }

  /**
   * レコード一覧取得
   */
  async getRecords(appId: string, query?: string): Promise<any[]> {
    const url = new URL(`${this.baseUrl}/k/v1/records.json`)
    url.searchParams.append('app', appId)
    if (query) {
      url.searchParams.append('query', query)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': this.apiToken
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get records: ${response.statusText}`)
    }

    const data = await response.json()
    return data.records || []
  }

  /**
   * レコード作成
   */
  async createRecord(appId: string, record: KintoneRecord): Promise<{ id: string }> {
    const response = await fetch(
      `${this.baseUrl}/k/v1/record.json`,
      {
        method: 'POST',
        headers: {
          'X-Cybozu-API-Token': this.apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app: appId,
          record
        })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to create record: ${error.message || response.statusText}`)
    }

    return response.json()
  }

  /**
   * レコード更新
   */
  async updateRecord(appId: string, recordId: string, record: KintoneRecord): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/k/v1/record.json`,
      {
        method: 'PUT',
        headers: {
          'X-Cybozu-API-Token': this.apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app: appId,
          id: recordId,
          record
        })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to update record: ${error.message || response.statusText}`)
    }
  }

  /**
   * 一括レコード作成
   */
  async bulkCreateRecords(appId: string, records: KintoneRecord[]): Promise<{ ids: string[] }> {
    const response = await fetch(
      `${this.baseUrl}/k/v1/records.json`,
      {
        method: 'POST',
        headers: {
          'X-Cybozu-API-Token': this.apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app: appId,
          records
        })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to bulk create records: ${error.message || response.statusText}`)
    }

    return response.json()
  }
}

/**
 * プロジェクトデータをkintoneレコードに変換
 */
export function projectToKintoneRecord(project: any): KintoneRecord {
  return {
    contract_number: { value: project.contract_number || '' },
    customer_name: { value: project.customer?.names?.join('・') || '' },
    contract_date: { value: project.contract_date || '' },
    construction_address: { value: project.construction_address || '' },
    lot_number: { value: project.lot_number || '' },
    status: { value: project.status || '' },
    sales_staff: {
      value: project.sales ? `${project.sales.last_name} ${project.sales.first_name}` : ''
    },
    design_staff: {
      value: project.design ? `${project.design.last_name} ${project.design.first_name}` : ''
    },
    construction_staff: {
      value: project.construction ? `${project.construction.last_name} ${project.construction.first_name}` : ''
    },
    contract_amount: { value: project.contract_amount || 0 },
    notes: { value: project.notes || '' }
  }
}
