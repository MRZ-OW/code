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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] animate-slide-up overflow-hidden rounded-t-3xl border-t border-line bg-surface shadow-card">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-sm font-bold text-zinc-100">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface-raised text-zinc-400 active:scale-95">
            <X size={16} />
          </button>
        </div>
        <div className="safe-bottom max-h-[62vh] overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="safe-bottom border-t border-line bg-surface-raised/80 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
