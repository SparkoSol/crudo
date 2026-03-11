import { Building2, Smartphone  , CheckCircle2 } from 'lucide-react';

export function BusinessProfile() {
    return (
        <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand-primary-600" />
                Perfil de Negocio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre de la Empresa</label>
                    <div className="text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                        We are Crudo
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Número de Teléfono de la Empresa</label>
                    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                        <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-gray-400" />
                            +34643656593
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Verificado
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
