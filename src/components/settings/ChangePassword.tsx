import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePassword } from '@/services/authServices';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordSchema, type PasswordFormValues } from '@/schemas/settings.schemas';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

export function ChangePassword() {
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPassword, setPendingPassword] = useState<string | null>(null);

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onPasswordSubmit = (data: PasswordFormValues) => {
    setPendingPassword(data.newPassword);
    setShowConfirmDialog(true);
  };

  const handleConfirmPasswordUpdate = async () => {
    if (!pendingPassword) return;

    try {
      setIsSavingPassword(true);
      await updatePassword(pendingPassword);
      resetPassword();
      toast.success('Contraseña actualizada con éxito');
      setPendingPassword(null);
    } catch (error: unknown) {
      console.error('Error updating password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar la contraseña';
      toast.error(errorMessage);
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Lock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Cambiar Contraseña</CardTitle>
            <CardDescription className="mt-1">
              Actualiza tu contraseña para mantener tu cuenta segura
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm font-medium">
              Contraseña Actual
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                {...registerPassword('currentPassword')}
                className="pl-10 pr-10 h-11"
                placeholder="Introduce tu contraseña actual"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {passwordErrors.currentPassword && (
              <p className="text-sm text-red-500 mt-1">
                {passwordErrors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                Nueva Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  {...registerPassword('newPassword')}
                  className="pl-10 pr-10 h-11"
                  placeholder="Introduce la nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="text-sm text-red-500 mt-1">
                  {passwordErrors.newPassword.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Debe tener al menos 8 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar Nueva Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...registerPassword('confirmPassword')}
                  className="pl-10 pr-10 h-11"
                  placeholder="Confirma la nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">
                  {passwordErrors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button 
              type="submit" 
              disabled={isSavingPassword} 
              className="gap-2 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 hover:from-brand-primary-700 hover:to-brand-primary-800 shadow-md"
            >
              {isSavingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Actualizar Contraseña
                </>
              )}
            </Button>
          </div>
        </form>

        <ConfirmationDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          onConfirm={handleConfirmPasswordUpdate}
          title="Confirmar Cambio de Contraseña"
          description="¿Estás seguro de que quieres cambiar tu contraseña? Deberás usar tu nueva contraseña para iniciar sesión la próxima vez."
          confirmText="Actualizar Contraseña"
          cancelText="Cancelar"
          variant="default"
          isLoading={isSavingPassword}
        />
      </CardContent>
    </Card>
  );
}
