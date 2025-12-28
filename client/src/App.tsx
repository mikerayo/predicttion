import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SolanaWalletProvider } from "@/lib/wallet-provider";
import { Header } from "@/components/header";
import Home from "@/pages/home";
import MarketDetail from "@/pages/market-detail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/market/:id" component={MarketDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored || (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SolanaWalletProvider>
          <AppContent />
          <Toaster />
        </SolanaWalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
