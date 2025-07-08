import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Index from "./pages/Index";
import AddOperator from "./pages/AddOperator";
import Auth from "./pages/Auth";
import ManageAccounts from "./pages/ManageAccounts";
import ChatsList from "./pages/ChatsList";
import ChatView from "./pages/ChatView";
import NotFound from "./pages/NotFound";
import AdminPanel from "./pages/AdminPanel";

const queryClient = new QueryClient();

const OperatorPanel = () => <div>Панель оператора (заглушка)</div>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/operator" element={<OperatorPanel />} />
          <Route path="/add-operator" element={<AddOperator />} />
          <Route path="/manage/:operatorId" element={<ManageAccounts />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/:operatorId" element={<Auth />} />
          <Route path="/auth/:operatorId/:accountId" element={<Auth />} />
          <Route path="/chats/:operatorId" element={<ChatsList />} />
          <Route path="/chat/:operatorId/:chatId" element={<ChatView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
