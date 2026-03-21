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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 pt-0">
      <div className="relative h-48 w-full bg-slate-100">
        <Image
          src={object.imageUrl}
          alt={object.title}
          fill
          className="object-cover object-top"
          unoptimized
        />
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg truncate text-slate-900">
          {object.title}
        </h3>
        <p className="text-slate-500 text-sm mt-1 line-clamp-2">
          {object.description}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          {new Date(object.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </CardContent>

      <CardFooter className="p-4 flex gap-2">
        <Link href={`/objects/${object._id}`} className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <Eye size={16} />
            Voir
          </Button>
        </Link>
        <Button
          variant="destructive"
          size="icon"
          disabled={isDeleting}
          onClick={() => onDelete(object._id)}
        >
          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </Button>
      </CardFooter>
    </Card>
  );
}
