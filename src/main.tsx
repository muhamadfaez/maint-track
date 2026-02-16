import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { HomePage } from '@/pages/HomePage'
import { TicketsPage } from '@/pages/TicketsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { TicketDetailPage } from '@/pages/TicketDetailPage'
import { Toaster } from "@/components/ui/sonner"
const queryClient = new QueryClient();
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/tickets",
    element: <TicketsPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/reports",
    element: <ReportsPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/tickets/:id",
    element: <TicketDetailPage />,
    errorElement: <RouteErrorBoundary />,
  }
]);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)