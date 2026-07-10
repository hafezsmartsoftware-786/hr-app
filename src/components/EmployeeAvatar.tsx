import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const DEFAULT_AVATARS = ["/avatar-1.png", "/avatar-2.png", "/avatar-3.png"];

function hashIndex(id: string, mod: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

export function employeePhotoUrl(id: string) {
  return DEFAULT_AVATARS[hashIndex(id, DEFAULT_AVATARS.length)];
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function EmployeeAvatar({
  id,
  name,
  className,
  fallbackClassName,
  url,
}: {
  id: string;
  name: string;
  className?: string;
  fallbackClassName?: string;
  url?: string | null;
}) {
  return (
    <Avatar className={cn("h-10 w-10", className)}>
      <AvatarImage src={url || employeePhotoUrl(id)} alt={name} />
      <AvatarFallback className={cn("bg-gradient-brand text-brand-foreground text-[10px] font-semibold", fallbackClassName)}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}