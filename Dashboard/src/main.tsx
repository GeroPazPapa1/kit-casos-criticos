// CSS imports MUST come first — before any React or component imports.
// Missing any one of these causes silent visual failures:
//   - leaflet.css: map tiles, popup chrome, controls
//   - MarkerCluster.css: cluster circle positioning
//   - MarkerCluster.Default.css: green/yellow/red cluster circle colors (D-02 default style)
import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'

// Tailwind comes AFTER Leaflet CSS to avoid specificity conflicts
import './index.css'

// Leaflet icon fix — Vite's asset hashing renames the default marker PNG files,
// breaking Leaflet's internal URL references. This must run before any map renders.
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl: iconShadow })

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
