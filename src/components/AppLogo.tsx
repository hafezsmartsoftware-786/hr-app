export function AppLogo({ 
  size = 40, 
  width,
  withWordmark = true, 
  tone = "auto" 
}: { 
  size?: number; 
  width?: number | string;
  withWordmark?: boolean; 
  tone?: "auto" | "light" | "dark";
}) {
  const adjustedHeight = width ? "auto" : size * 1.6;
  const finalWidth = width || "auto";

  return (
    <div className="flex items-center">
      <img 
        src="/logo.png" 
        alt="Staff Link" 
        style={{ height: adjustedHeight, width: finalWidth, objectFit: "contain" }} 
      />
    </div>
  );
}
