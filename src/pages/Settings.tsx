import { Sidebar } from '@/components/dashboard/Sidebar';
import { ProfileInformation } from '@/components/settings/ProfileInformation';
import { ChangePassword } from '@/components/settings/ChangePassword';

export default function Settings() {

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <div className="p-6 lg:p-8 max-w-5xl mx-auto pt-20 lg:pt-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">
              Manage your account settings, profile information, and security preferences
            </p>
          </div>

          <div className="space-y-6">
            <ProfileInformation />
            <ChangePassword />
          </div>
        </div>
      </main>
    </div>
  );
}
