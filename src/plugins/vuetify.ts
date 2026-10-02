import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#101114',
          surface: '#181a1f',
          primary: '#8ab4f8',
          secondary: '#a7b0c0',
          error: '#ff6b6b',
          warning: '#f5c451',
          success: '#57cc99',
          info: '#64b5f6',
        },
      },
    },
  },
})
