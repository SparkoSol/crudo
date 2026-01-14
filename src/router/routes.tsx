import { lazy } from "react";
import { type RouteObject } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import ForgetPassword from "@/pages/auth/ForgotPassword";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const Settings = lazy(() => import("../pages/Settings"));
const Salespeople = lazy(() => import("../pages/Salespeople"));
const Templates = lazy(() => import("../pages/Templates"));
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const NotFound = lazy(() => import("../pages/NotFound"));

export const ROUTES = {
  DASHBOARD: "/",
  SETTINGS: "/settings",
  SALESPEOPLE: "/salespeople",
  TEMPLATES: "/templates",
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  FORGET_PASSWORD: "/auth/forgot-password",
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
    element: <Layout />,
    children: [
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
        path: "*",
        element: <NotFound />,
      },
    ],
  },
];
