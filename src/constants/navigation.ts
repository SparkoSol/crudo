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
        label: "Inicio",
        icon: LayoutDashboard,
        path: "/",
        description: "Ver y gestionar informes de campo de tu equipo de ventas",
        roles: [Role.MANAGER, Role.SALES_REPRESENTATIVE],
        requiresActiveSubscription: true,
    },
    {
        label: "Vendedores",
        icon: Users,
        path: "/salespeople",
        description: "Gestionar a los miembros de tu equipo de ventas y sus perfiles",
        roles: [Role.MANAGER],
        requiresActiveSubscription: true,
    },
    {
        label: "Invitar",
        icon: UserPlus,
        path: "/invite",
        description: "Invitar a representantes de ventas a unirse a tu equipo",
        roles: [Role.MANAGER],
        requiresActiveSubscription: true,
    },
    {
        label: "Plantillas",
        icon: FileText,
        path: "/templates",
        description: "Crear y gestionar plantillas de informes para tu equipo",
        roles: [Role.MANAGER],
        requiresActiveSubscription: true,
    },
    {
        label: "WhatsApp",
        icon: MessageSquare,
        path: "/whatsapp",
        description: "Probar y gestionar tu integración con WhatsApp Business API",
        roles: [Role.MANAGER],
        requiresActiveSubscription: true,
    },
    {
        label: "Créditos y Transcripciones",
        icon: Mic,
        path: "/voice-transcripts",
        description: "Ver y gestionar tus transcripciones de mensajes de voz",
        roles: [Role.MANAGER, Role.SALES_REPRESENTATIVE],
        requiresActiveSubscription: true,
    },
    {
        label: "Suscripción",
        icon: CreditCard,
        path: "/subscription",
        description: "Gestionar tu plan y detalles de facturación",
        roles: [Role.MANAGER],
        requiresActiveSubscription: false,
    },
    {
        label: "Configuración",
        icon: Settings,
        path: "/settings",
        description: "Gestionar la configuración y preferencias de tu cuenta",
        roles: [Role.MANAGER, Role.SALES_REPRESENTATIVE],
        requiresActiveSubscription: true,
    },
];
