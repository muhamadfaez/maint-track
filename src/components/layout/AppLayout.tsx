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
      <SidebarInset className={cn("bg-mesh bg-dot-grid relative", className)}>
        {/* Only show desktop trigger to keep mobile UI clean and focused on MagicNav */}
        <div className="absolute left-2 top-2 z-20 hidden md:block">
          <SidebarTrigger />
        </div>
        {/* 
           - Mobile: pb-32 (8rem) to clear the floating MagicNav (bottom-6 + 4rem height + breathing room)
           - Desktop: standard padding
        */}
        <div className={container ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12 pb-32 md:pb-12" : "pb-32 md:pb-0"}>
          <div className={contentClassName}>{children}</div>
        </div>
        {/* Floating MagicNav is fixed; AppLayout ensures content beneath doesn't overlap at the very bottom */}
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}