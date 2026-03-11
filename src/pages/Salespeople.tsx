import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  Building2,
  User,
  Loader2,
  Unlink,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  getManagedProfiles,
  unlinkPhoneNumber,
  deleteProfile,
} from "@/services/profileServices";
import type { Profile } from "@/types/profile.types";
import toast from "react-hot-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useNavigate } from "react-router-dom";
import { EditSalespersonDialog } from "./EditSalespersonDialog";

export default function Salespeople() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await getManagedProfiles();
      const salesReps = data.filter((p) => p.role === "sales_representative");
      setProfiles(salesReps);
    } catch (error) {
      console.error("Failed to load salespeople:", error);
      toast.error("Error al cargar los vendedores");
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
      toast.success("Número de teléfono desvinculado con éxito");

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === selectedProfileId ? { ...p, phone_number: null } : p,
        ),
      );
    } catch (error) {
      console.error("Failed to unlink phone number:", error);
      toast.error("Error al desvincular el número de teléfono");
    } finally {
      setOperatingId(null);
      setSelectedProfileId(null);
      setShowUnlinkConfirm(false);
    }
  };

  const handleDeleteClick = (profile: Profile) => {
    setProfileToDelete(profile);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!profileToDelete) return;

    try {
      setOperatingId(profileToDelete.id);
      await deleteProfile(profileToDelete.id);
      toast.success("Vendedor eliminado con éxito");
      setProfiles((prev) => prev.filter((p) => p.id !== profileToDelete.id));
    } catch (error) {
      console.error("Failed to delete salesperson:", error);
      toast.error("Error al eliminar al vendedor");
    } finally {
      setOperatingId(null);
      setProfileToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const filteredProfiles = profiles.filter((profile) => {
    const query = searchQuery.toLowerCase();
    return (
      profile.full_name?.toLowerCase().includes(query) ||
      profile.email.toLowerCase().includes(query) ||
      profile.phone_number?.includes(query)
    );
  });
  const handleEditClick = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsEditOpen(true);
  };

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Vendedores
            </h1>
            <p className="text-gray-600">
              Gestiona a los miembros de tu equipo de ventas y sus perfiles
            </p>
          </div>
          <Button
            onClick={() => navigate("/invite")}
            className="gap-2 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 hover:from-brand-primary-700 hover:to-brand-primary-800 shadow-md"
          >
            <UserPlus className="h-4 w-4" />
            Invitar Vendedor
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar vendedores..."
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se encontraron vendedores
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? "Intenta ajustar tus términos de búsqueda"
                : "Invita a tu primer vendedor para empezar"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => (
            <Card
              key={profile.id}
              className="border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand-primary-100 flex items-center justify-center text-brand-primary-600 font-bold">
                      {profile.full_name ? (
                        profile.full_name.charAt(0).toUpperCase()
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-gray-900">
                        {profile.full_name || "Vendedor sin nombre"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Se unió el{" "}
                        {new Date(profile.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-brand-primary-600 hover:bg-brand-primary-50 transition-colors"
                      onClick={() => handleEditClick(profile)}
                      title="Editar Vendedor"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      onClick={() => handleDeleteClick(profile)}
                      disabled={operatingId === profile.id}
                      title="Eliminar Vendedor"
                    >
                      {operatingId === profile.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
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
                      <span
                        className={
                          profile.phone_number ? "" : "text-gray-400 italic"
                        }
                      >
                        {profile.phone_number || "Sin número de teléfono"}
                      </span>
                      {profile.phone_number && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleUnlinkClick(profile.id)}
                          disabled={operatingId === profile.id}
                          title="Desvincular Número de Teléfono"
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
        title="Desvincular Número de Teléfono"
        description="¿Estás seguro de que quieres desvincular el número de teléfono de este vendedor? Deberá volver a verificar su número para usar el sistema."
        confirmText="Desvincular"
        cancelText="Cancelar"
        isLoading={!!operatingId}
      />
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Vendedor"
        description={`¿Estás seguro de que quieres eliminar a ${profileToDelete?.full_name || "este vendedor"}? Esta acción lo eliminará permanentemente de tu equipo. Esto no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        isLoading={!!operatingId}
      />
      <EditSalespersonDialog
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onUpdated={loadProfiles} // Refresh profiles after edit
        salesperson={
          selectedProfile
            ? {
                id: selectedProfile.id,
                full_name: selectedProfile.full_name || "",
                email: selectedProfile.email,
                phone_number: selectedProfile.phone_number || "",
                whatsapp_number: selectedProfile.phone_number || "",
                status: selectedProfile.is_active ? "active" : "inactive",
                template_id: selectedProfile.template_id || "",
              }
            : null
        }
      />
    </div>
  );
}
