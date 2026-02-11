import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, Search, Phone, Mail, Building2, User, Loader2, Unlink } from 'lucide-react';
import { getManagedProfiles, unlinkPhoneNumber } from '@/services/profileServices';
import type { Profile } from '@/types/profile.types';
import toast from 'react-hot-toast';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useNavigate } from 'react-router-dom';

export default function Salespeople() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await getManagedProfiles();
      const salesReps = data.filter(p => p.role === 'sales_representative');
      setProfiles(salesReps);
    } catch (error) {
      console.error('Failed to load salespeople:', error);
      toast.error('Failed to load salespeople');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkClick = (id: string) => {
    setSelectedProfileId(id);
    setShowUnlinkConfirm(true);
  };

  const handleUnlinkConfirm = async () => {
    if (!selectedProfileId) return;

    try {
      setOperatingId(selectedProfileId);
      await unlinkPhoneNumber(selectedProfileId);
      toast.success('Phone number unlinked successfully');

      setProfiles(prev => prev.map(p =>
        p.id === selectedProfileId ? { ...p, phone_number: null } : p
      ));
    } catch (error) {
      console.error('Failed to unlink phone number:', error);
      toast.error('Failed to unlink phone number');
    } finally {
      setOperatingId(null);
      setSelectedProfileId(null);
      setShowUnlinkConfirm(false);
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const query = searchQuery.toLowerCase();
    return (
      profile.full_name?.toLowerCase().includes(query) ||
      profile.email.toLowerCase().includes(query) ||
      profile.phone_number?.includes(query)
    );
  });

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Salespeople</h1>
            <p className="text-gray-600">
              Manage your sales team members and their profiles
            </p>
          </div>
          <Button
            onClick={() => navigate('/invite')}
            className="gap-2 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 hover:from-brand-primary-700 hover:to-brand-primary-800 shadow-md"
          >
            <UserPlus className="h-4 w-4" />
            Invite Salesperson
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary-600" />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No salespeople found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search terms' : 'Invite your first salesperson to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand-primary-100 flex items-center justify-center text-brand-primary-600 font-bold">
                      {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-gray-900">
                        {profile.full_name || 'Unnamed Salesperson'}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Joined {new Date(profile.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 flex items-center justify-between">
                      <span className={profile.phone_number ? '' : 'text-gray-400 italic'}>
                        {profile.phone_number || 'No phone number'}
                      </span>
                      {profile.phone_number && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleUnlinkClick(profile.id)}
                          disabled={operatingId === profile.id}
                          title="Unlink Phone Number"
                        >
                          {operatingId === profile.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Unlink className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {profile.company_name && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="truncate">{profile.company_name}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={showUnlinkConfirm}
        onOpenChange={setShowUnlinkConfirm}
        onConfirm={handleUnlinkConfirm}
        title="Unlink Phone Number"
        description="Are you sure you want to unlink this salesperson's phone number? They will need to re-verify their number to use the system."
        confirmText="Unlink"
        cancelText="Cancel"
        isLoading={!!operatingId}
      />
    </div>
  );
}
