import type { ReactNode } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface SubPageContainerProps {
  title: string
  children: ReactNode
  onAddSubPage?: () => void
  columnCount?: number
}

export function SubPageContainer({ title, children, onAddSubPage, columnCount = 1 }: SubPageContainerProps) {
  // 1 col -> 650px, 2 cols -> 500px, 3+ -> 420px
  const wClass = columnCount <= 1 ? "w-[650px]" : columnCount === 2 ? "w-[500px]" : "w-[420px]";
  
  return (
    <div 
      className={`h-full ${wClass} flex flex-col border-x-2 border-t-2 border-border bg-card rounded-t-[24px] shadow-sm overflow-hidden relative transition-all duration-300 shrink-0`}
    >
      {/* Header dính */}
      <div className="sticky top-0 z-20 w-full px-6 py-4 backdrop-blur-xl bg-background/80 border-b-2 flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        {onAddSubPage && (
          <Button variant="ghost" size="icon" onClick={onAddSubPage} className="rounded-full">
             <Plus size={20} />
          </Button>
        )}
      </div>
      
      {/* Phần cuộn mượt bằng radix scroll-area */}
      <ScrollArea className="flex-1 w-full bg-card">
        {children}
      </ScrollArea>
    </div>
  )
}
