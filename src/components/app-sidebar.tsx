import React from "react";
import { LayoutDashboard, ClipboardList, BarChart3, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarSeparator,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
export function AppSidebar(): JSX.Element {
  const location = useLocation();
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight">UniMaintain</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Facility Control</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/"}>
                <Link to="/">
                  <LayoutDashboard className="size-4" /> 
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname.startsWith("/tickets")}>
                <Link to="/tickets">
                  <ClipboardList className="size-4" /> 
                  <span>Tickets</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/reports"}>
                <Link to="/reports">
                  <BarChart3 className="size-4" /> 
                  <span>Reports</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4">
          <div className="bg-accent/50 rounded-lg p-3">
            <p className="text-xs font-semibold">Support Center</p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              Mon-Fri: 8AM - 6PM
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}