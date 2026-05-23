import { useToastStore } from '../stores/toastStore'

const TYPE_STYLES = {
  success: '#16a34a',
  error: '#dc2626',
  info: '#2563eb',
  warning: '#d97706',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 360,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: TYPE_STYLES[t.type] || '#333',
          color: '#fff', padding: '10px 16px', borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, lineHeight: 1.4, cursor: 'pointer',
          transition: 'opacity 0.2s',
        }} onClick={() => removeToast(t.id)}>
          <span style={{ flex: 1 }}>{t.message}</span>
          <span style={{ fontSize: 16, opacity: 0.8 }}>✕</span>
        </div>
      ))}
    </div>
  )
}
