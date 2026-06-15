import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import UnitNoDetails from "./pages/UnitNoDetails";
import AdminLogin from "./pages/AdminLogin";
import AdminOwnerInfo from "./pages/AdminOwnerInfo";
import AdminAppointments from "./pages/AdminAppointments";
import AdminUnitTypes from "./pages/AdminUnitTypes";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/unit-details" component={UnitNoDetails} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin" component={AdminOwnerInfo} />
      <Route path="/admin/appointments" component={AdminAppointments} />
      <Route path="/admin/unit-types" component={AdminUnitTypes} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster position="top-right" closeButton richColors />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
