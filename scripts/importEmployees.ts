import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// .envファイルを読み込んでパース
const envPath = join(process.cwd(), '.env')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    envVars[key] = value
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません')
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY が必要です')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 従業員データの型定義
interface EmployeeData {
  name: string
  email: string
  department: string
  role: string
  phone?: string
  hire_date?: string
}

// 名前を姓と名に分割する関数
function splitName(fullName: string): { lastName: string; firstName: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length >= 2) {
    return {
      lastName: parts[0],
      firstName: parts.slice(1).join(' ')
    }
  }
  return {
    lastName: fullName,
    firstName: ''
  }
}

// 従業員データ（CSVから抽出）
const employeeData: EmployeeData[] = [
  // その他 → 佐古さんは営業部に配属
  { name: '趙 晃啓', email: 'cho.kousuke@ghouse.co.jp', department: 'その他', role: 'staff' },
  { name: '佐古 祐太', email: 'sako.yuta@ghouse.co.jp', department: '営業', role: 'staff' },

  // 営業部
  { name: '奥村 礼人', email: 'okumura.reito@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '德田 耕明', email: 'tokuda.koumei@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '吉田 祐', email: 'yoshida.yu@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '杉村 悠斗', email: 'sugimura.yuto@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '阿部 澄人', email: 'abe.sumito@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '髙木 徹', email: 'takagi.toru@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '湯谷 憲一', email: 'yutani.kenichi@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '舟橋 裕也', email: 'funahashi.yuya@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '小松 大樹', email: 'komatsu.daiki@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '葉山 一輝', email: 'hayama.kazuki@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '西村 貴裕', email: 'nishimura.takahiro@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '稲尾 拓慎', email: 'inao.takuma@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '金村 晃功', email: 'kanamura.akira@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '光川 実緒', email: 'mitsukawa.mio@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '助永 光子', email: 'sukenaga.mitsuko@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '森川 公代', email: 'morikawa.kimiyo@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '福田 萌乃', email: 'fukuda.moeno@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '三浦 麻美', email: 'miura.asami@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '中内 理加', email: 'nakauchi.rika@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '川村 明日香', email: 'kawamura.asuka@ghouse.co.jp', department: '営業', role: 'staff' },
  { name: '本田 優茉', email: 'honda.yuma@ghouse.co.jp', department: '営業', role: 'staff' },

  // 設計部
  { name: '箕浦 三四郎', email: 'minoura.sanshiro@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '林 恭生', email: 'hayashi.yasuo@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '北村 晃平', email: 'kitamura.kohei@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '若狹 龍成', email: 'wakasa.ryusei@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '柳川 奈緒', email: 'yanagawa.nao@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '西川 由佳', email: 'nishikawa.yuka@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '古久保 知佳子', email: 'furukubo.chikako@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '島田 真奈', email: 'shimada.mana@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '吉川 侑希', email: 'yoshikawa.yuki@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '中川 千尋', email: 'nakagawa.chihiro@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '今村 珠梨', email: 'imamura.juri@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '浦川 千夏', email: 'urakawa.chinatsu@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '森永 凪子', email: 'morinaga.nagiko@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '中野 一樹', email: 'nakano.kazuki@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '黄前 翔', email: 'oumae.sho@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '中川 莉奈', email: 'nakagawa.rina@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '有馬 瑠那', email: 'arima.runa@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '土井 穂', email: 'doi.minori@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '南 成美', email: 'minami.narumi@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '十河 佐奈恵', email: 'sogo.sanae@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '高田 さゆり', email: 'takada.sayuri@ghouse.co.jp', department: '意匠設計', role: 'staff' },
  { name: '東 尚美', email: 'higashi.naomi@ghouse.co.jp', department: '意匠設計', role: 'staff' },

  // 工事部
  { name: '藤田 誠一', email: 'fujita.seiichi@ghouse.co.jp', department: '工事', role: 'staff' },
  { name: '藤本 成規', email: 'fujimoto.seiki@ghouse.co.jp', department: '工事', role: 'staff' },
  { name: '清家 雅章', email: 'seike.masaaki@ghouse.co.jp', department: '工事', role: 'staff' },
  { name: '荻田 一樹', email: 'ogita.kazuki@ghouse.co.jp', department: '工事', role: 'staff' },
  { name: '大植 崇義', email: 'oue.takayoshi@ghouse.co.jp', department: '工事', role: 'staff' },
  { name: '新井 智之', email: 'arai.tomoyuki@ghouse.co.jp', department: '工事', role: 'staff' },
  { name: '高月 雄大', email: 'takatsuki.yudai@ghouse.co.jp', department: '工事', role: 'staff' },
  { name: '泊 大輝', email: 'tomari.daiki@ghouse.co.jp', department: '工事', role: 'staff' },
  { name: '樋川 茜', email: 'hikawa.akane@ghouse.co.jp', department: '工事', role: 'staff' },
  { name: '趙 祐規', email: 'cho.yuuki@ghouse.co.jp', department: '工事', role: 'staff' },
  { name: '湯山 豊和', email: 'yuyama.toyokazu@ghouse.co.jp', department: '工事', role: 'staff' },
  { name: '山中 祥子', email: 'yamanaka.shoko@ghouse.co.jp', department: '工事', role: 'staff' },
  { name: '濵中 美咲', email: 'hamanaka.misaki@ghouse.co.jp', department: '工事', role: 'staff' },

  // 不動産事業部
  { name: '清水 崇志', email: 'shimizu.takashi@ghouse.co.jp', department: '不動産営業', role: 'staff' },
  { name: '吉田 萌', email: 'yoshida.moe@ghouse.co.jp', department: '不動産営業', role: 'staff' },
  { name: '中村 勇斗', email: 'nakamura.yuto@ghouse.co.jp', department: '不動産営業', role: 'staff' },
  { name: '川鍋 錠二', email: 'kawanabe.joji@ghouse.co.jp', department: '不動産営業', role: 'staff' },
  { name: '工藤 成穂', email: 'kudo.nariho@ghouse.co.jp', department: '不動産営業', role: 'staff' },
  { name: '永田 樹里', email: 'nagata.juri@ghouse.co.jp', department: '不動産営業', role: 'staff' },
  { name: '吉田 百子', email: 'yoshida.momoko@ghouse.co.jp', department: '不動産営業', role: 'staff' },

  // 外構事業部
  { name: '橋尾 彰範', email: 'hashio.akinori@ghouse.co.jp', department: '外構工事', role: 'staff' },
  { name: '藤本 龍志', email: 'fujimoto.ryuji@ghouse.co.jp', department: '外構工事', role: 'staff' },

  // CS推進部
  { name: '奥 和俊', email: 'oku.kazutoshi@ghouse.co.jp', department: 'CS推進', role: 'staff' },

  // 商品企画部
  { name: '西野 秀樹', email: 'nishino.hideki@ghouse.co.jp', department: '商品企画', role: 'staff' },
  { name: '西 俊幸', email: 'nishi.toshiyuki@ghouse.co.jp', department: '商品企画', role: 'staff' },
  { name: '米山 真史', email: 'yoneyama.masashi@ghouse.co.jp', department: '商品企画', role: 'staff' },
  { name: '山根 敬一', email: 'yamane.keiichi@ghouse.co.jp', department: '商品企画', role: 'staff' },

  // 広告・マーケティング部
  { name: '池本 公宣', email: 'ikemoto.kiminobu@ghouse.co.jp', department: 'マーケティング', role: 'staff' },
  { name: '林 明日香', email: 'hayashi.asuka@ghouse.co.jp', department: 'マーケティング', role: 'staff' },
  { name: '梅原 千尋', email: 'umehara.chihiro@ghouse.co.jp', department: 'マーケティング', role: 'staff' },
  { name: '田村 麻衣', email: 'tamura.mai@ghouse.co.jp', department: 'マーケティング', role: 'staff' },
  { name: '角山 千恵', email: 'kakuyama.chie@ghouse.co.jp', department: 'マーケティング', role: 'staff' },

  // システム開発部
  { name: '村瀬 秀光', email: 'murase.hidemitsu@ghouse.co.jp', department: 'システム開発', role: 'staff' },
  { name: '荒木 清佳', email: 'araki.sayaka@ghouse.co.jp', department: 'システム開発', role: 'staff' },

  // 経営管理部
  { name: '西村 武弘', email: 'nishimura.takehiro@ghouse.co.jp', department: '経営管理', role: 'staff' },
  { name: '藤原 里帆', email: 'fujiwara.riho@ghouse.co.jp', department: '経営管理', role: 'staff' },
  { name: '中田 雪乃', email: 'nakata.yukino@ghouse.co.jp', department: '経営管理', role: 'staff' },
  { name: '保木 裕恵', email: 'hoki.hiroe@ghouse.co.jp', department: '経営管理', role: 'staff' },
  { name: '岸本 真帆', email: 'kishimoto.maho@ghouse.co.jp', department: '経営管理', role: 'staff' },
  { name: '矢幡 美紗', email: 'yahata.misa@ghouse.co.jp', department: '経営管理', role: 'staff' },
  { name: '辻 綾夏', email: 'tsuji.ayaka@ghouse.co.jp', department: '経営管理', role: 'staff' },
  { name: '野長瀬 恵', email: 'nonagase.megumi@ghouse.co.jp', department: '経営管理', role: 'staff' },

  // 財務戦略部
  { name: '丹保 真人', email: 'tanbo.masato@ghouse.co.jp', department: '財務戦略', role: 'staff' },
  { name: '河野 律子', email: 'kono.ritsuko@ghouse.co.jp', department: '財務戦略', role: 'staff' },

  // BtoB
  { name: '森山 敬史', email: 'moriyama.keishi@ghouse.co.jp', department: 'BtoB営業', role: 'staff' },
  { name: '森田 和也', email: 'morita.kazuya@ghouse.co.jp', department: 'BtoB営業', role: 'staff' }
]

async function importEmployees() {
  console.log('🔄 従業員データをインポートします...\n')

  if (employeeData.length === 0) {
    console.error('❌ インポートする従業員データがありません')
    console.error('employeeData配列にデータを追加してください')
    process.exit(1)
  }

  let successCount = 0
  let errorCount = 0

  for (const employee of employeeData) {
    try {
      // メールアドレスの重複チェック
      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('email', employee.email)
        .single()

      if (existing) {
        console.log(`⚠️  スキップ: ${employee.name} (${employee.email}) は既に存在します`)
        continue
      }

      // 名前を姓と名に分割
      const { lastName, firstName } = splitName(employee.name)

      // 従業員を挿入
      const { error } = await supabase
        .from('employees')
        .insert({
          last_name: lastName,
          first_name: firstName,
          email: employee.email,
          department: employee.department,
          role: employee.role,
          phone: employee.phone
        })

      if (error) {
        console.error(`❌ エラー: ${employee.name}`, error.message)
        errorCount++
      } else {
        console.log(`✅ 追加: ${employee.name} (${employee.department})`)
        successCount++
      }
    } catch (error: any) {
      console.error(`❌ エラー: ${employee.name}`, error.message)
      errorCount++
    }
  }

  console.log('\n=== インポート完了 ===')
  console.log(`✅ 成功: ${successCount}件`)
  console.log(`❌ エラー: ${errorCount}件`)
  console.log(`📊 合計: ${employeeData.length}件`)
}

// 実行
importEmployees().catch(console.error)
