import { lazy } from "react";
import { type RouteObject } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import { RoleBasedRoute } from "./RoleBasedRoute";
import { Role } from "../types/auth.types";
import ForgetPassword from "@/pages/auth/ForgotPassword";

const Home = lazy(() => import("../pages/Home"));
const RTKQueryTest = lazy(() => import("../pages/RTKQueryTest"));
const ManagerDashboard = lazy(() => import("../pages/ManagerDashboard"));
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const NotFound = lazy(() => import("../pages/NotFound"));

export const ROUTES = {
  HOME: "/",
  RTK_TEST: "/rtk-test",
  MANAGER_DASHBOARD: "/manager/dashboard",
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  FORGET_PASSWORD: "/auth/forgot-password",
} as const;

export const routes: RouteObject[] = [
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
        path: ROUTES.RTK_TEST,
        element: (
          <ProtectedRoute>
            <RTKQueryTest />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.MANAGER_DASHBOARD,
        element: (
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={[Role.MANAGER]}>
              <ManagerDashboard />
            </RoleBasedRoute>
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
        path: "*",
        element: <NotFound />,
      },
    ],
  },
];
