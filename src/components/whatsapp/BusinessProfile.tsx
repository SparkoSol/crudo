import { Building2, Smartphone, Clock, AlertCircle } from 'lucide-react';

export function BusinessProfile() {
    return (
        <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand-primary-600" />
                Business Profile
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Business Name</label>
                    <div className="text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                        We are Crudo
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Business Phone Number</label>
                    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                        <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-gray-400" />
                            +34643656593
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="h-3 w-3" />
                            Pending Review
                        </span>
                    </div>
                </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                    <span className="font-semibold">Note:</span> Messaging will be fully enabled once the WhatsApp Business number is approved by Meta. Currently in sandbox/pending mode.
                </p>
            </div>
        </div>
    );
}
