import { lazy } from "react";
import { type RouteObject } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import ForgetPassword from "@/pages/auth/ForgotPassword";
import Home from "@/pages/Home";
import { RoleBasedRoute } from "./RoleBasedRoute";
import { Role } from "@/types/auth.types";

import { DashboardLayout } from "../components/dashboard/DashboardLayout";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const Settings = lazy(() => import("../pages/Settings"));
const Salespeople = lazy(() => import("../pages/Salespeople"));
const Templates = lazy(() => import("../pages/Templates"));
const WhatsApp = lazy(() => import("../pages/WhatsApp"));
const VoiceTranscripts = lazy(() => import("../pages/VoiceTranscripts"));
const Invite = lazy(() => import("../pages/Invite"));
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const Subscription = lazy(() => import("../pages/Subscription"));
const DashboardStatus = lazy(() => import("../pages/DashboardStatus"));
const NotFound = lazy(() => import("../pages/NotFound"));
const AccessDenied = lazy(() => import("../pages/AccessDenied"));
const ReportDetail = lazy(() => import("../pages/ReportDetail"));

export const ROUTES = {
  DASHBOARD: "/",
  REPORT_DETAIL: "/reporte/:id",
  SETTINGS: "/settings",
  SALESPEOPLE: "/salespeople",
  TEMPLATES: "/templates",
  WHATSAPP: "/whatsapp",
  VOICE_TRANSCRIPTS: "/voice-transcripts",
  HOME: "/",
  INVITE: "/invite",
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  FORGET_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",
  SUBSCRIPTION: "/subscription",
  DASHBOARD_STATUS: "/dashboard/status",
  ACCESS_DENIED: "/access-denied",
} as const;

export const routes: RouteObject[] = [
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: ROUTES.DASHBOARD,
        element: <Dashboard />,
      },
      {
        path: ROUTES.REPORT_DETAIL,
        element: <ReportDetail />,
      },
      {
        path: ROUTES.DASHBOARD_STATUS,
        element: <DashboardStatus />,
      },
      {
        path: ROUTES.SETTINGS,
        element: <Settings />,
      },
      {
        path: ROUTES.SALESPEOPLE,
        element: (
          <RoleBasedRoute allowedRoles={[Role.MANAGER]}>
            <Salespeople />
          </RoleBasedRoute>
        ),
      },
      {
        path: ROUTES.TEMPLATES,
        element: (
          <RoleBasedRoute allowedRoles={[Role.MANAGER]}>
            <Templates />
          </RoleBasedRoute>
        ),
      },
      {
        path: ROUTES.WHATSAPP,
        element: (
          <RoleBasedRoute allowedRoles={[Role.MANAGER]}>
            <WhatsApp />
          </RoleBasedRoute>
        ),
      },
      {
        path: ROUTES.VOICE_TRANSCRIPTS,
        element: (
          <RoleBasedRoute allowedRoles={[Role.MANAGER, Role.SALES_REPRESENTATIVE]}>
            <VoiceTranscripts />
          </RoleBasedRoute>
        ),
      },
      {
        path: ROUTES.SUBSCRIPTION,
        element: (
          <RoleBasedRoute allowedRoles={[Role.MANAGER]}>
            <Subscription />
          </RoleBasedRoute>
        ),
      },
      {
        path: ROUTES.INVITE,
        element: (
          <RoleBasedRoute allowedRoles={[Role.MANAGER]}>
            <Invite />
          </RoleBasedRoute>
        ),
      },
    ],
  },

  {
    element: <Layout />,
    children: [
      {
        path: ROUTES.HOME,
        element: (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.LOGIN,
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        ),
      },
      {
        path: ROUTES.REGISTER,
        element: (
          <PublicRoute>
            <Register />
          </PublicRoute>
        ),
      },
      {
        path: ROUTES.FORGET_PASSWORD,
        element: (
          <PublicRoute>
            <ForgetPassword />
          </PublicRoute>
        ),
      },
      {
        path: ROUTES.RESET_PASSWORD,
        element: (
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        ),
      },
      {
        path: ROUTES.ACCESS_DENIED,
        element: (
          <ProtectedRoute>
            <AccessDenied />
          </ProtectedRoute>
        ),
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
];
