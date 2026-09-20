import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthContext';
import { AuthGate } from './auth/AuthGate';
import { AppShell } from './layout/AppShell';
import { WarRoomPage } from './features/war-room/WarRoomPage';
import { ApolloHunterPage } from './features/apollo-hunter/ApolloHunterPage';
import { FreelanceRadarPage } from './features/freelance-radar/FreelanceRadarPage';
import { ClientVaultPage } from './features/client-vault/ClientVaultPage';
import { ClientDetailPage } from './features/client-vault/ClientDetailPage';
import { GrowthStudioPage } from './features/growth-studio/GrowthStudioPage';
import { DailyLeadsPage } from './features/daily-leads/DailyLeadsPage';
import { AiAgentLabPage } from './features/ai-agent-lab/AiAgentLabPage';
import { RevenueCommandPage } from './features/revenue-command/RevenueCommandPage';
import { AnalyticsTowerPage } from './features/analytics-tower/AnalyticsTowerPage';
import { OutreachComposerPage } from './features/outreach-composer/OutreachComposerPage';
import { SettingsPage } from './features/settings/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<WarRoomPage />} />
                <Route path="daily" element={<DailyLeadsPage />} />
                <Route path="apollo" element={<ApolloHunterPage />} />
                <Route path="freelance" element={<FreelanceRadarPage />} />
                <Route path="clients" element={<ClientVaultPage />} />
                <Route path="clients/:id" element={<ClientDetailPage />} />
                <Route path="growth" element={<GrowthStudioPage />} />
                <Route path="agents" element={<AiAgentLabPage />} />
                <Route path="revenue" element={<RevenueCommandPage />} />
                <Route path="analytics" element={<AnalyticsTowerPage />} />
                <Route path="outreach" element={<OutreachComposerPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
