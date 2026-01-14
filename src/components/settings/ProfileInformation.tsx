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
import { User, Mail, Save, Loader2, Shield, Calendar, UserCircle } from 'lucide-react';
import type { Profile } from '@/types/profile.types';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

export function ProfileInformation() {
  const { refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      email: '',
    },
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const profileData = await getProfile();
        setProfile(profileData);
        if (profileData) {
          resetProfile({
            full_name: profileData.full_name || '',
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
  }, [resetProfile]);

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
