import { useEffect } from 'react'
import { X } from 'lucide-react'

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 animate-fade-in bg-black/70" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] animate-sheet-up overflow-hidden rounded-t-xl border-t-2 border-zinc-700 bg-zinc-900">
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-zinc-700" />
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="font-mc text-[14px] font-black text-zinc-100">{title}</h2>
          <button onClick={onClose} className="slot flex h-8 w-8 items-center justify-center text-zinc-400 active:translate-y-px">
            <X size={16} />
          </button>
        </div>
        <div className="safe-bottom max-h-[62vh] overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="safe-bottom border-t border-zinc-800 bg-[#161618] px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
