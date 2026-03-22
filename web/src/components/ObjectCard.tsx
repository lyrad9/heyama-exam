"use client";

import { ObjectItem } from "@/src/types";
import { Card, CardContent, CardFooter } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Trash2, Eye, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Props {
  object: ObjectItem;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export default function ObjectCard({ object, onDelete, isDeleting }: Props) {
  return (
    <Card className="group overflow-hidden border-none transition-all duration-500 bg-white/80 backdrop-blur-sm pt-0 h-full flex flex-col">
      {/* Image Container with Hover Effect */}
      <div className="relative h-56 w-full overflow-hidden bg-slate-100">
        <Image
          src={object.imageUrl}
          alt={object.title}
          fill
          className="object-cover object-top transition-transform duration-700 group-hover:scale-110"
          unoptimized
        />
      </div>

      <CardContent className="p-3 grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-xl tracking-tight line-clamp-1 text-blue-600 transition-colors">
            {object.title}
          </h3>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 min-h-10">
          {object.description}
        </p>

        <div className="mt-4 flex items-center gap-2 text-slate-400">
          <div className="h-px grow bg-slate-100" />
          <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-50 px-2 py-0.5 rounded">
            {new Date(object.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </CardContent>

      <CardFooter className="p-4 flex gap-2">
        <Link href={`/objects/${object._id}`} className="flex-1">
          <Button className="w-full h-11 bg-slate-900 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-blue-200 gap-2 border-none">
            Voir l'objet
          </Button>
        </Link>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all duration-300 group/delete"
          disabled={isDeleting}
          onClick={() => onDelete(object._id)}
        >
          {isDeleting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Trash2
              size={18}
              className="group-hover/delete:scale-110 transition-transform"
            />
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
