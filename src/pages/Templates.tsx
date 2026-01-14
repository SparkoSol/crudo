import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Plus, Search, Edit, Trash2, Copy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Templates() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const mockTemplates = [
    {
      id: '1',
      name: 'Standard Sales Report',
      description: 'Template for standard field sales reports',
      category: 'Sales Report',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-15',
      fields: ['Customer Name', 'Date', 'Duration', 'Novelties', 'Objections'],
    },
    {
      id: '2',
      name: 'Quick Check-in',
      description: 'Template for quick daily check-ins',
      category: 'Check-in',
      createdAt: '2024-02-01',
      updatedAt: '2024-02-01',
      fields: ['Location', 'Status', 'Notes'],
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <div className="p-6 lg:p-8 pt-20 lg:pt-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Templates</h1>
                <p className="text-gray-600">
                  Create and manage report templates for your team
                </p>
              </div>
              <Button className="gap-2 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 hover:from-brand-primary-700 hover:to-brand-primary-800 shadow-md">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search templates..."
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
                    <p className="text-sm text-gray-600 mb-1">Total Templates</p>
                    <p className="text-2xl font-bold text-gray-900">{mockTemplates.length}</p>
                  </div>
                  <div className="p-3 bg-brand-primary-100 rounded-lg">
                    <FileText className="h-6 w-6 text-brand-primary-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Templates</p>
                    <p className="text-2xl font-bold text-gray-900">{mockTemplates.length}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Categories</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {new Set(mockTemplates.map(t => t.category)).size}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600" />
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
