/** Global toast messaging (role=status announcements). */
import { create } from 'zustand'

export interface ToastAction {
  label: string
  run: () => void
}

export interface ToastItem {
  id: number
  message: string
  kind: 'info' | 'error'
  action?: ToastAction
  sticky?: boolean
}

interface ToastState {
  toasts: ToastItem[]
  push: (message: string, opts?: { kind?: 'info' | 'error'; action?: ToastAction; sticky?: boolean }) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (message, opts = {}) => {
    const id = nextId++
    const item: ToastItem = { id, message, kind: opts.kind ?? 'info', action: opts.action, sticky: opts.sticky }
    set((s) => ({ toasts: [...s.toasts.slice(-2), item] }))
    if (!item.sticky) {
      window.setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, 4200)
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function toast(message: string, opts?: Parameters<ToastState['push']>[1]): void {
  useToasts.getState().push(message, opts)
}
