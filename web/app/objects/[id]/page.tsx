"use client";

import { useParams, useRouter } from "next/navigation";
import { ObjectItem } from "@/src/types";
import { getObject, deleteObject } from "@/src/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/src/components/ui/button";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import Image from "next/image";

export default function ObjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: object, isLoading, error } = useQuery<ObjectItem>({
    queryKey: ["object", id],
    queryFn: () => getObject(id),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteObject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objects"] });
      router.push("/");
    },
    onError: (err) => {
      console.error("❌ Erreur suppression:", err);
      alert("Erreur lors de la suppression. Réessaie.");
    },
  });

  const handleDelete = async () => {
    if (!confirm("Supprimer cet objet ?")) return;
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-slate-400" size={40} />
      </div>
    );
  }

  if (!object) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-slate-500">Objet introuvable</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-6 gap-2"
        >
          <ArrowLeft size={16} />
          Retour
        </Button>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="relative h-72 w-full bg-slate-100">
            <Image
              src={object.imageUrl}
              alt={object.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900">
              {object.title}
            </h1>
            <p className="text-slate-600 mt-3 leading-relaxed">
              {object.description}
            </p>
            <p className="text-sm text-slate-400 mt-4">
              Créé le{" "}
              {new Date(object.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="mt-6 gap-2"
            >
              <Trash2 size={16} />
              Supprimer cet objet
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
