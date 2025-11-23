import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ✅ enregistre le SW en prod
import { registerSW } from 'virtual:pwa-register'

registerSW({
  onNeedRefresh() {
    // micro-toast simple (pas intrusif)
    console.log('[PWA] Update disponible, recharge la page.')
  },
  onOfflineReady() {
    console.log('[PWA] App prête offline.')
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
