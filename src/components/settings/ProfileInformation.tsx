import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile } from '@/services/profileServices';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, type ProfileFormValues } from '@/schemas/settings.schemas';
import toast from 'react-hot-toast';
import { User, Mail, Save, Loader2, Shield, Calendar, UserCircle, Building2, Phone } from 'lucide-react';
import type { Profile } from '@/types/profile.types';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface ProfileInformationProps {
  initialData?: Profile | null;
}

export function ProfileInformation({ initialData }: ProfileInformationProps) {
  const { refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<ProfileFormValues | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      phone_number: '',
      email: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      setProfile(initialData);
      resetProfile({
        full_name: initialData.full_name || '',
        phone_number: initialData.phone_number || '',
        email: initialData.email,
      });
      setIsLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const profileData = await getProfile();
        setProfile(profileData);
        if (profileData) {
          resetProfile({
            full_name: profileData.full_name || '',
            phone_number: profileData.phone_number || '',
            email: profileData.email,
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [resetProfile, initialData]);

  const onProfileSubmit = (data: ProfileFormValues) => {
    setPendingFormData(data);
    setShowConfirmDialog(true);
  };

  const handleConfirmUpdate = async () => {
    if (!pendingFormData) return;

    try {
      setIsSavingProfile(true);
      // Only update full_name, email is read-only
      const updatedProfile = await updateProfile({
        full_name: pendingFormData.full_name || undefined,
        phone_number: pendingFormData.phone_number?.replace(/[^0-9+]/g, '') || undefined,
      });
      setProfile(updatedProfile);

      await refreshProfile();

      toast.success('Profile updated successfully');
      setPendingFormData(null);
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary-100 rounded-lg">
            <UserCircle className="h-5 w-5 text-brand-primary-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Profile Information</CardTitle>
            <CardDescription className="mt-1">
              Update your personal information and contact details
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-medium">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="full_name"
                  {...registerProfile('full_name')}
                  className="pl-10 h-11"
                  placeholder="Enter your full name"
                />
              </div>
              {profileErrors.full_name && (
                <p className="text-sm text-red-500 mt-1">
                  {profileErrors.full_name.message}
                </p>
              )}
            </div>

            {profile?.role !== 'manager' && (
              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-sm font-medium">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="phone_number"
                    {...registerProfile('phone_number')}
                    className={`pl-10 h-11 ${profile?.phone_number ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="e.g. +92 3XX... or +34 6XX..."
                    disabled={!!profile?.phone_number}
                    readOnly={!!profile?.phone_number}
                  />
                </div>
                {profile?.phone_number ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Phone number cannot be changed once set. Contact support for assistance.
                  </p>
                ) : (
                  profileErrors.phone_number && (
                    <p className="text-sm text-red-500 mt-1">
                      {profileErrors.phone_number.message}
                    </p>
                  )
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  {...registerProfile('email')}
                  className="pl-10 h-11 bg-gray-50 cursor-not-allowed"
                  placeholder="Enter your email"
                  disabled
                  readOnly
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name" className="text-sm font-medium">
                Company Name
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="company_name"
                  type="text"
                  value={profile?.company_name || ''}
                  className="pl-10 h-11 bg-gray-50 cursor-not-allowed"
                  placeholder="Company name"
                  disabled
                  readOnly
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Company name cannot be changed
              </p>
            </div>
          </div>

          {profile && (
            <div className="pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Role</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {profile.role.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Member since</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              type="submit"
              disabled={isSavingProfile}
              className="gap-2 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 hover:from-brand-primary-700 hover:to-brand-primary-800 shadow-md"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>

        <ConfirmationDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          onConfirm={handleConfirmUpdate}
          title="Confirm Profile Update"
          description="Are you sure you want to update your profile information? This action will save your changes."
          confirmText="Save Changes"
          cancelText="Cancel"
          isLoading={isSavingProfile}
        />
      </CardContent>
    </Card>
  );
}
