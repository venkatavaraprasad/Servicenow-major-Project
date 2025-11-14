import React, { useContext } from "react";
import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import { useTheme } from "./ThemeContext";   // your dark mode context
import { AuthContext } from "./AuthProvider.jsx"; // login context

export default function LoginCard({ isLogged }) {
  const { darkMode } = useTheme();
  const { login } = useContext(AuthContext);

  if (isLogged) return null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",

        
        background: darkMode
          ? "linear-gradient(to right, #0d1117, #1e293b)" // dark mode gradient
          : "linear-gradient(to right, #1976d2, #42a5f5)", // light mode gradient
      }}
    >
      <Card
        sx={{
          width: 380,
          borderRadius: 4,
          boxShadow: 6,

          /* 🔥 Card color respects theme automatically */
          backgroundColor: (theme) => theme.palette.background.paper,
          color: (theme) => theme.palette.text.primary,

          p: 2,
          textAlign: "center",
        }}
      >
        <CardContent>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Welcome Back 👋
          </Typography>

          <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
            Please log in to continue
          </Typography>

          {/* 🔥 Login button triggers the same login() used in App.jsx */}
          <Button
            variant="contained"
            size="large"
            sx={{
              borderRadius: 3,
              px: 4,
              py: 1.2,
              textTransform: "none",
              fontWeight: "bold",
            }}
            onClick={login}
          >
            Log In with ServiceNow
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
