import { Card, CardContent, CardFooter } from "@/src/components/ui/card";

export default function ObjectCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col h-full bg-white border-slate-200">
      <div className="aspect-video w-full bg-slate-200 animate-pulse" />
      <CardContent className="p-4 flex-1">
        <div className="h-6 w-3/4 bg-slate-100 rounded animate-pulse mb-2" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="h-4 w-24 bg-slate-50 rounded animate-pulse" />
        <div className="h-9 w-9 bg-slate-50 rounded animate-pulse" />
      </CardFooter>
    </Card>
  );
}
