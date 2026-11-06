import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import '@fontsource-variable/roboto'
import App from './App'
import './styles.css'
import './refinements.css'
import './components/TripChat.css'
import './components/FloatingChatLink.css'
import './components/Navigation.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>,
)
