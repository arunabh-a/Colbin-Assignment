import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { setupApiInterceptors } from "@/service/app.api";
import { useEffect } from "react";
import Auth from "./pages/auth";
import Profile from "./pages/main";

const App = () => {
  useEffect(() => {
    // Setup API interceptors for automatic token refresh
    setupApiInterceptors();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/main" element={<Profile />} />
            <Route path="/profile" element={<Navigate to="/main" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
