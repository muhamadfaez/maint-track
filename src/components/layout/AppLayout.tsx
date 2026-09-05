import React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";
type AppLayoutProps = {
  children: React.ReactNode;
  container?: boolean;
  className?: string;
  contentClassName?: string;
};
export function AppLayout({ children, container = false, className, contentClassName }: AppLayoutProps): JSX.Element {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className={cn("bg-mesh bg-dot-grid relative overflow-x-hidden", className)}>
        {/* Only show desktop trigger to keep mobile UI clean and focused on MagicNav */}
        <div className="absolute left-2 top-2 z-20 hidden md:block">
          <SidebarTrigger />
        </div>
        {/* 
           - Mobile: pb-32 (8rem) to clear the floating MagicNav (bottom-6 + 4rem height + breathing room)
           - Desktop: standard padding
        */}
        <div className={container
          ? "mx-auto w-full min-w-0 max-w-7xl px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-8 md:pb-10 md:pt-10 lg:px-8"
          : "w-full min-w-0 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-0"}>
          <div className={cn(container && "mx-auto w-full min-w-0 max-w-6xl", contentClassName)}>{children}</div>
        </div>
        {/* Floating MagicNav is fixed; AppLayout ensures content beneath doesn't overlap at the very bottom */}
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
