import { lazy } from "react";
import { type RouteObject } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import ForgetPassword from "@/pages/auth/ForgotPassword";
import Home from "@/pages/Home";
import { RoleBasedRoute } from "./RoleBasedRoute";
import { Role } from "@/types/auth.types";

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
const NotFound = lazy(() => import("../pages/NotFound"));

export const ROUTES = {
  DASHBOARD: "/",
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
} as const;

export const routes: RouteObject[] = [
  {
    path: ROUTES.DASHBOARD,
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.SETTINGS,
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.SALESPEOPLE,
    element: (
      <ProtectedRoute>
        <Salespeople />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.TEMPLATES,
    element: (
      <ProtectedRoute>
        <Templates />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.WHATSAPP,
    element: (
      <ProtectedRoute>
        <WhatsApp />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.VOICE_TRANSCRIPTS,
    element: (
      <ProtectedRoute>
        <VoiceTranscripts />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.SUBSCRIPTION,
    element: (
      <ProtectedRoute>
        <Subscription />
      </ProtectedRoute>
    ),
  },
  {
    element: <Layout />,
    children: [
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
        path: "*",
        element: <NotFound />,
      },
    ],
  },
];
