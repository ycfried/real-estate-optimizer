import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Calculator from "@/pages/Calculator";
import Comparison from "@/pages/Comparison";
import Auth from "@/pages/Auth";
const queryClient = new QueryClient();
function Router() {
return (
<Switch>
<Route path="/" component={Calculator} />
<Route path="/compare" component={Comparison} />
<Route path="/auth" component={Auth} />
<Route component={NotFound} />
</Switch>
);
}
function App() {
return (
<QueryClientProvider client={queryClient}>
<TooltipProvider>
<WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
<Router />
</WouterRouter>
<Toaster />
</TooltipProvider>
</QueryClientProvider>
);
}
export default App;