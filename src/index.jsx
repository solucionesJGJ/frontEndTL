import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'

import App from './App'
import store from './store'
import { FeedbackProvider } from './context/FeedbackContext'

createRoot(document.getElementById('root')).render(
  <FeedbackProvider>
    <Provider store={store}>
      <App />
    </Provider>
  </FeedbackProvider>
)
