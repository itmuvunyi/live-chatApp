import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import UserChat from "@/pages/user-chat";
import NotFound from "@/pages/not-found";

function Router() {
  const [user, setUser] = useState<{ username: string; isAdmin: boolean } | null>(null);

  const handleLogin = (username: string, isAdmin: boolean) => {
    setUser({ username, isAdmin });
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Switch>
      <Route path="/">
        {user.isAdmin ? (
          <AdminDashboard />
        ) : (
          <UserChat username={user.username} onLeave={handleLogout} />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
