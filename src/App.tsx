import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index";
import Onboarding from "@/pages/Onboarding";
import Auth from "./pages/Auth";
import HomeFeed from "./pages/HomeFeed";
import SearchPage from "./pages/SearchPage";
import RecipeDetail from "./pages/RecipeDetail";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import SettingsPage from "./pages/SettingsPage";
import CreatorProfile from "./pages/CreatorProfile";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import CreatePage from "./pages/CreatePage";
import SavedRecipesPage from "./pages/SavedRecipesPage";
import ReelsPage from "./pages/ReelsPage";
import MessagesPage from "./pages/MessagesPage";
import ChatPage from "./pages/ChatPage";
import NotFound from "./pages/NotFound";
import CreatorDashboard from "@/pages/CreatorDashboard";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="max-w-lg mx-auto min-h-screen relative bg-background shadow-2xl">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/index" element={<Index />} />
           <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/home" element={<HomeFeed />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/recipe/:id" element={<RecipeDetail />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/creator/:username" element={<CreatorProfile />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/saved" element={<SavedRecipesPage />} />
            <Route path="/reels" element={<ReelsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:otherId" element={<ChatPage />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/creator-dashboard" element={<CreatorDashboard />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
