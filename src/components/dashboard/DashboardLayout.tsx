import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Loading } from "@/components/Loading";

export const DashboardLayout = () => {
    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto lg:ml-0">
                <Suspense fallback={<Loading message="Loading..." className="h-full" />}>
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
};
