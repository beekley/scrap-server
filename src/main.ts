import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/98.css'
import './assets/theme-overrides.css'
const app = createApp(App)

app.use(createPinia())

app.mount('#app')
