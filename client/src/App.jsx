import { AppBar, Toolbar, Typography, Container, IconButton } from "@mui/material";
import { Link, Routes, Route, Outlet } from "react-router-dom";
import Home from "./Home.jsx";
import About from "./About.jsx";
import NotFound from "./NotFound.jsx";
import IncidentForm from "./IncientForm.jsx";   
import styles from "./App.module.css";
import { AuthContext } from "./AuthProvider.jsx";
import { useContext } from "react";
import { useTheme } from "./ThemeContext.jsx";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

function App() {
  function Layout() {
    const { isLogged, logout, login } = useContext(AuthContext);
    const { darkMode, toggleDarkMode } = useTheme();

    return (
      <>
        <AppBar 
          position="static" 
          sx={{ paddingX:2 }}
        >
          <Toolbar 
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Revature
            </Typography>

            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              {isLogged ? (
                <>
                  <Link className={styles.link} to="/">
                    Home
                  </Link>
                  <Link className={styles.link} to="/about">
                    About
                  </Link>
                  
                  <Link 
                    className={styles.link} 
                    to="#" 
                    onClick={(e) => { e.preventDefault(); logout(); }}
                  >
                    Logout
                  </Link>
                </>
              ) : (
                <Link 
                  className={styles.link} 
                  to="#" 
                  onClick={(e) => { e.preventDefault(); login(); }}
                >
                  Login with ServiceNow
                </Link>
              )}
              
              {/* Dark Mode Toggle Button */}
              <IconButton onClick={toggleDarkMode} color="inherit" sx={{ ml: 1 }}>
                {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </div>

          </Toolbar>
       </AppBar>

        {/* Main Content Wrapper */}
        <Container sx={{ mt: 5 }}>
          <Outlet />
        </Container>
      </>
    );
  }

  return (
    <>
      <Routes>
        <Route element={<Layout />}>

          
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/incident/:sys_id" element={<IncidentForm />} />
          <Route path="*" element={<NotFound />} />

        </Route>
      </Routes>
    </>
  );
}

export default App;
