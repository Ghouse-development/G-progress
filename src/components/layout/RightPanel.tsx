import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card"
import { Badge } from "../ui/Badge"
import { CheckCircle2, Circle, Lightbulb } from "lucide-react"
import { cn } from "../../lib/utils"

export interface RightPanelProps {
  className?: string
}

const RightPanel = React.forwardRef<HTMLDivElement, RightPanelProps>(
  ({ className }, ref) => {
    // ダミーデータ
    const todayTasks = [
      { id: 1, title: "案件A 設計打合せ", completed: true },
      { id: 2, title: "見積書作成", completed: false },
      { id: 3, title: "顧客B 電話確認", completed: false },
    ]

    const aiHints = [
      "着工予定の案件が3件あります",
      "支払期限が近い案件を確認してください",
    ]

    return (
      <aside
        ref={ref}
        className={cn("w-full lg:w-80 shrink-0 space-y-6", className)}
      >
        {/* 今日やること */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">今日やること</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        task.completed ? "text-gray-500 line-through" : "text-gray-900"
                      )}
                    >
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* サマリ */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">サマリ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">進行中案件</span>
                  <Badge variant="default">12件</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">今週納期</span>
                  <Badge variant="warning">3件</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">遅延</span>
                  <Badge variant="error">1件</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AIヒント */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-indigo-600" />
                <span>AIヒント</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {aiHints.map((hint, index) => (
                  <div
                    key={index}
                    className="text-sm text-gray-700 p-2 bg-white/60 rounded-lg"
                  >
                    {hint}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </aside>
    )
  }
)

RightPanel.displayName = "RightPanel"

export { RightPanel }
