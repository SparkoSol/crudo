import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, Search, Calendar } from 'lucide-react';
import { MOCK_SALESPEOPLE } from '@/constants/mockData';

export default function Salespeople() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <div className="p-6 lg:p-8 pt-20 lg:pt-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Salespeople</h1>
                <p className="text-gray-600">
                  Manage your sales team members and their profiles
                </p>
              </div>
              <Button className="gap-2 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 hover:from-brand-primary-700 hover:to-brand-primary-800 shadow-md">
                <UserPlus className="h-4 w-4" />
                Add Salesperson
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search salespeople..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Salespeople</p>
                    <p className="text-2xl font-bold text-gray-900">{MOCK_SALESPEOPLE.length}</p>
                  </div>
                  <div className="p-3 bg-brand-primary-100 rounded-lg">
                    <Users className="h-6 w-6 text-brand-primary-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Members</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {MOCK_SALESPEOPLE.filter(p => p.status === 'active').length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">This Month</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
