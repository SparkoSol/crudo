import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, ArrowLeft, Ghost, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white bg-grid-white relative flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute top-0 -left-4 w-96 h-96 bg-brand-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" />
      <div className="absolute -bottom-8 -right-4 w-96 h-96 bg-brand-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-xl relative shrink-0">
        <div className="text-center mb-10 opacity-0 animate-reveal" style={{ animationDelay: '100ms' }}>
          <div className="relative inline-block group">
            <div className="text-[12rem] font-black text-brand-primary-900/5 leading-none select-none transition-transform duration-500 group-hover:scale-105">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Ghost className="h-28 w-28 text-brand-primary-600 animate-float drop-shadow-xl" strokeWidth={1.2} />
            </div>
            <div className="absolute -top-2 -right-2">
              <Sparkles className="h-8 w-8 text-brand-primary-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-gray-900 mt-6 tracking-tight">
            ¿Te has perdido?
          </h1>
          <p className="text-lg text-gray-500 mt-3 max-w-sm mx-auto font-medium">
            La página que buscas ha desaparecido en otra dimensión. Vamos a traerte de vuelta.
          </p>
        </div>

        <Card className="border-none glass-premium rounded-[2.5rem] overflow-hidden opacity-0 animate-reveal shadow-2xl" style={{ animationDelay: '300ms' }}>
          <div className="h-2 bg-gradient-to-r from-brand-primary-400 via-brand-primary-600 to-brand-primary-800" />
          <CardContent className="p-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-8 border-b border-gray-100/50">
              <Button
                asChild
                className="h-16 text-lg font-bold bg-brand-primary-600 hover:bg-brand-primary-700 text-white rounded-2xl shadow-lg shadow-brand-primary-200/50 transition-all hover:scale-[1.03] active:scale-[0.98] group"
              >
                <Link to="/">
                  <Home className="mr-2.5 h-6 w-6 transition-transform group-hover:-translate-y-0.5" />
                  Volver al Inicio
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="h-16 text-lg font-bold border-2 border-gray-100 hover:border-brand-primary-200 hover:bg-brand-primary-50/30 text-gray-600 hover:text-brand-primary-700 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.98] group"
              >
                <ArrowLeft className="mr-2.5 h-6 w-6 transition-transform group-hover:-translate-x-1" />
                Regresar
              </Button>
            </div>

            <div className="mt-8 flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-1.5 opacity-40">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-900 font-black">
                  We Are Crudo
                </p>
                <div className="h-1 w-12 bg-brand-primary-600 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
