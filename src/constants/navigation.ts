import {
    LayoutDashboard,
    Users,
    FileText,
    Settings,
    UserPlus,
    MessageSquare,
    Mic,
    CreditCard,
} from "lucide-react";
import { Role } from "@/types/auth.types";

export interface NavItem {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
    description: string;
    roles: Role[];
    requiresActiveSubscription: boolean;
}

export const navItems: NavItem[] = [
    {
        label: "Home",
        icon: LayoutDashboard,
        path: "/",
        description: "View and manage field reports from your sales team",
        roles: [Role.MANAGER, Role.SALES_REPRESENTATIVE],
        requiresActiveSubscription: true,
    },
    {
        label: "Salespeople",
        icon: Users,
        path: "/salespeople",
        description: "Manage your sales team members and their profiles",
        roles: [Role.MANAGER, Role.SALES_REPRESENTATIVE],
        requiresActiveSubscription: true,
    },
    {
        label: "Invite",
        icon: UserPlus,
        path: "/invite",
        description: "Invite sales representatives to join your team",
        roles: [Role.MANAGER],
        requiresActiveSubscription: true,
    },
    {
        label: "Templates",
        icon: FileText,
        path: "/templates",
        description: "Create and manage report templates for your team",
        roles: [Role.MANAGER],
        requiresActiveSubscription: true,
    },
    {
        label: "WhatsApp",
        icon: MessageSquare,
        path: "/whatsapp",
        description: "Test and manage your WhatsApp Business API integration",
        roles: [Role.MANAGER],
        requiresActiveSubscription: true,
    },
    {
        label: "Credits and Transcripts",
        icon: Mic,
        path: "/voice-transcripts",
        description: "View and manage your voice message transcripts",
        roles: [Role.MANAGER],
        requiresActiveSubscription: true,
    },
    {
        label: "Subscription",
        icon: CreditCard,
        path: "/subscription",
        description: "Manage your plan and billing details",
        roles: [Role.MANAGER],
        requiresActiveSubscription: false,
    },
    {
        label: "Settings",
        icon: Settings,
        path: "/settings",
        description: "Manage your account settings and preferences",
        roles: [Role.MANAGER, Role.SALES_REPRESENTATIVE],
        requiresActiveSubscription: true,
    },
];
