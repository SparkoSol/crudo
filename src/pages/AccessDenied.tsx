
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/router/routes';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getProfile } from '@/services/profileServices';

export default function AccessDenied() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [managerEmail, setManagerEmail] = useState<string | null>(null);
    const [isLoadingManager, setIsLoadingManager] = useState(true);

    useEffect(() => {
        const fetchManagerEmail = async () => {
            if (profile?.manager_id) {
                try {
                    const managerProfile = await getProfile(profile.manager_id);
                    if (managerProfile?.email) {
                        setManagerEmail(managerProfile.email);
                    }
                } catch (error) {
                    console.error('Error fetching manager profile:', error);
                } finally {
                    setIsLoadingManager(false);
                }
            } else {
                setIsLoadingManager(false);
            }
        };

        fetchManagerEmail();
    }, [profile?.manager_id]);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate(ROUTES.LOGIN);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-lg border-red-100">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                        <ShieldAlert className="w-8 h-8 text-red-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">Acceso Denegado</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-gray-600">
                        Tu empresa se quedó sin créditos o no tiene una suscripción activa.
                    </p>
                     {!isLoadingManager && managerEmail && (
                         <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
                             Por favor, contacta con tu responsable en{' '}
                             <a href={`mailto:${managerEmail}`} className="font-semibold text-blue-600 hover:underline">
                                 {managerEmail}
                             </a>
                             {' '}para obtener más ayuda sobre tu acceso a la plataforma.
                         </p>
                     )}
                     {!isLoadingManager && !managerEmail && (
                         <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                             Por favor, contacta con tu responsable para obtener más ayuda sobre tu acceso a la plataforma.
                         </p>
                     )}
                    {isLoadingManager && (
                        <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            Cargando información del responsable...
                        </p>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center pt-2">
                    <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
