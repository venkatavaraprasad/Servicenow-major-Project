import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { createTheme } from '@mui/material/styles'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './AuthProvider.jsx'
import { ThemeProvider, useTheme } from './ThemeContext.jsx'


function MuiThemeWrapper({ children }) {
  const { darkMode } = useTheme();

  // Create theme with dark or light mode
  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#1976d2'},
      secondary: { main: '#7948ecff'}
    }
  }), [darkMode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <MuiThemeWrapper>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </MuiThemeWrapper>
    </ThemeProvider>
  </StrictMode>,
)
