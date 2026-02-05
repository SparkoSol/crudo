import { Globe, CheckCircle2, XCircle } from 'lucide-react';

interface ConnectionStatusProps {
    status: 'idle' | 'success' | 'error';
    lastTestResult: string | null;
}

export function ConnectionStatus({ status, lastTestResult }: ConnectionStatusProps) {
    return (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Connection Status</span>
                </div>
                {status === 'success' && (
                    <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-medium">Connected</span>
                    </div>
                )}
                {status === 'error' && (
                    <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">Error</span>
                    </div>
                )}
                {status === 'idle' && (
                    <div className="flex items-center gap-1 text-gray-400">
                        <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                        <span className="text-xs font-medium">Ready</span>
                    </div>
                )}
            </div>
            {lastTestResult && (
                <div className={`text-sm mt-2 p-2 rounded ${status === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : status === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-gray-50 text-gray-700'
                    }`}>
                    {lastTestResult}
                </div>
            )}
        </div>
    );
}
