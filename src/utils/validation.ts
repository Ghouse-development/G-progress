/**
 * フォームバリデーションユーティリティ
 *
 * すべてのフォーム入力に対する統一されたバリデーションロジック
 */

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export interface ValidationRule<T = any> {
  field: keyof T
  rules: Array<{
    type: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom'
    value?: any
    message: string
    validator?: (value: any) => boolean
  }>
}

/**
 * 必須項目チェック
 */
export function validateRequired(value: any, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName}は必須です`
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName}は必須です`
  }
  if (Array.isArray(value) && value.length === 0) {
    return `${fieldName}を選択してください`
  }
  return null
}

/**
 * メールアドレス形式チェック
 */
export function validateEmail(value: string): string | null {
  if (!value) return null // 必須チェックは別で行う

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(value)) {
    return '有効なメールアドレスを入力してください'
  }
  return null
}

/**
 * 最小文字数チェック
 */
export function validateMinLength(value: string, min: number, fieldName: string): string | null {
  if (!value) return null // 必須チェックは別で行う

  if (value.length < min) {
    return `${fieldName}は${min}文字以上で入力してください`
  }
  return null
}

/**
 * 最大文字数チェック
 */
export function validateMaxLength(value: string, max: number, fieldName: string): string | null {
  if (!value) return null // 必須チェックは別で行う

  if (value.length > max) {
    return `${fieldName}は${max}文字以内で入力してください`
  }
  return null
}

/**
 * 数値範囲チェック
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): string | null {
  if (value === null || value === undefined) return null

  if (value < min || value > max) {
    return `${fieldName}は${min}～${max}の範囲で入力してください`
  }
  return null
}

/**
 * 正規表現パターンチェック
 */
export function validatePattern(
  value: string,
  pattern: RegExp,
  message: string
): string | null {
  if (!value) return null

  if (!pattern.test(value)) {
    return message
  }
  return null
}

/**
 * 電話番号形式チェック（日本）
 */
export function validatePhoneNumber(value: string): string | null {
  if (!value) return null

  // ハイフンあり/なし両方対応
  const phonePattern = /^0\d{9,10}$|^0\d{1,4}-\d{1,4}-\d{4}$/
  if (!phonePattern.test(value)) {
    return '有効な電話番号を入力してください（例: 03-1234-5678 または 0312345678）'
  }
  return null
}

/**
 * 郵便番号形式チェック（日本）
 */
export function validatePostalCode(value: string): string | null {
  if (!value) return null

  const postalPattern = /^\d{3}-?\d{4}$/
  if (!postalPattern.test(value)) {
    return '有効な郵便番号を入力してください（例: 123-4567）'
  }
  return null
}

/**
 * URL形式チェック
 */
export function validateUrl(value: string): string | null {
  if (!value) return null

  try {
    new URL(value)
    return null
  } catch {
    return '有効なURLを入力してください（例: https://example.com）'
  }
}

/**
 * 日付チェック
 */
export function validateDate(value: string | Date): string | null {
  if (!value) return null

  const date = typeof value === 'string' ? new Date(value) : value
  if (isNaN(date.getTime())) {
    return '有効な日付を入力してください'
  }
  return null
}

/**
 * 日付範囲チェック
 */
export function validateDateRange(
  startDate: string | Date,
  endDate: string | Date
): string | null {
  if (!startDate || !endDate) return null

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate

  if (start > end) {
    return '開始日は終了日より前の日付を指定してください'
  }
  return null
}

/**
 * 汎用バリデーション関数
 * ルール配列に基づいてフォーム全体をバリデーション
 */
export function validate<T extends Record<string, any>>(
  data: T,
  rules: ValidationRule<T>[]
): ValidationResult {
  const errors: Record<string, string> = {}

  for (const rule of rules) {
    const fieldValue = data[rule.field]

    for (const { type, value: ruleValue, message, validator } of rule.rules) {
      let error: string | null = null

      switch (type) {
        case 'required':
          error = validateRequired(fieldValue, String(rule.field))
          break

        case 'email':
          error = validateEmail(fieldValue)
          break

        case 'min':
          if (typeof fieldValue === 'string') {
            error = validateMinLength(fieldValue, ruleValue, String(rule.field))
          } else if (typeof fieldValue === 'number') {
            error = validateRange(fieldValue, ruleValue, Infinity, String(rule.field))
          }
          break

        case 'max':
          if (typeof fieldValue === 'string') {
            error = validateMaxLength(fieldValue, ruleValue, String(rule.field))
          } else if (typeof fieldValue === 'number') {
            error = validateRange(fieldValue, -Infinity, ruleValue, String(rule.field))
          }
          break

        case 'pattern':
          error = validatePattern(fieldValue, ruleValue, message)
          break

        case 'custom':
          if (validator && !validator(fieldValue)) {
            error = message
          }
          break
      }

      if (error) {
        errors[String(rule.field)] = error
        break // 1つのフィールドで最初のエラーのみ記録
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * プロジェクトフォームのバリデーション例
 */
export function validateProjectForm(data: {
  customer_id: string
  contract_date: string
  construction_start_date?: string
  construction_end_date?: string
  construction_address: string
}) {
  return validate(data, [
    {
      field: 'customer_id',
      rules: [{ type: 'required', message: '顧客を選択してください' }]
    },
    {
      field: 'contract_date',
      rules: [{ type: 'required', message: '契約日は必須です' }]
    },
    {
      field: 'construction_address',
      rules: [
        { type: 'required', message: '工事住所は必須です' },
        { type: 'max', value: 200, message: '工事住所は200文字以内で入力してください' }
      ]
    }
  ])
}

/**
 * タスクフォームのバリデーション例
 */
export function validateTaskForm(data: {
  title: string
  due_date?: string
  assigned_to?: string
}) {
  return validate(data, [
    {
      field: 'title',
      rules: [
        { type: 'required', message: 'タスク名は必須です' },
        { type: 'max', value: 100, message: 'タスク名は100文字以内で入力してください' }
      ]
    }
  ])
}

/**
 * 顧客フォームのバリデーション例
 */
export function validateCustomerForm(data: {
  names: string[]
  phone1?: string
  email?: string
  postal_code?: string
}) {
  const errors: Record<string, string> = {}

  // 顧客名チェック
  if (!data.names || data.names.length === 0 || !data.names[0]) {
    errors.names = '顧客名は必須です'
  }

  // 電話番号チェック
  if (data.phone1) {
    const phoneError = validatePhoneNumber(data.phone1)
    if (phoneError) errors.phone1 = phoneError
  }

  // メールアドレスチェック
  if (data.email) {
    const emailError = validateEmail(data.email)
    if (emailError) errors.email = emailError
  }

  // 郵便番号チェック
  if (data.postal_code) {
    const postalError = validatePostalCode(data.postal_code)
    if (postalError) errors.postal_code = postalError
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}
