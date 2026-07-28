const fs = require('fs');
const file = 'src/routes/admin.org-chart.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Imports
code = code.replace(
  'ExternalLink, ShieldAlert } from "lucide-react";',
  'ExternalLink, ShieldAlert, Paintbrush } from "lucide-react";'
);
code = code.replace(
  'import { Button } from "@/components/ui/button";',
  'import { Button } from "@/components/ui/button";\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";\n\nexport type CardVariant = "default" | "minimal" | "badge" | "vibrant";'
);

// 2. PersonCard and EmptyPositionCard
const oldCardsRegex = /function PersonCard[\s\S]*?function DeptNode/g;
const newCards = `function PersonCard({
  person,
  accent,
  title,
  deptName,
  onOpen,
  editing = false,
  variant = "default",
}: {
  person: OrgPerson;
  accent?: "primary" | "head" | "ghost";
  title?: string;
  deptName?: string;
  onOpen: (p: OrgPerson, ctx: { title?: string; deptName?: string }) => void;
  editing?: boolean;
  variant?: CardVariant;
}) {
  const sortable = useSortable({ id: \`person:\${person.id}\`, data: { type: "person", personId: person.id }, disabled: !editing });
  const style = editing ? {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : 1,
  } : undefined;
  
  const displayTitle = title ?? person.positionName ?? "Team Member";
  const isPrimary = accent === "primary";
  const isHead = accent === "head";

  const sharedProps = {
    ref: editing ? sortable.setNodeRef : undefined,
    style,
    onClick: () => !editing && onOpen(person, { title, deptName }),
    ...(editing ? sortable.attributes : { role: "button" }),
    ...(editing ? sortable.listeners : {}),
  };

  if (variant === "minimal") {
    const ringColor = isPrimary ? "ring-blue-600 bg-blue-600" : isHead ? "ring-orange-500 bg-orange-500" : "ring-teal-500 bg-teal-500";
    return (
      <div {...sharedProps} className={\`group relative flex w-52 flex-col items-center justify-center p-3 transition-all \${editing ? "cursor-grab" : "hover:-translate-y-1 hover:scale-105"}\`}>
        <div className={\`relative flex h-24 w-24 items-center justify-center rounded-full ring-[4px] \${ringColor} ring-offset-4 ring-offset-background\`}>
          <EmployeeAvatar id={person.id} name={person.name} url={person.avatarUrl} className="h-full w-full rounded-full border-4 border-background" />
        </div>
        <div className="mt-5 text-center w-full">
          <div className="truncate text-[13px] font-bold text-foreground uppercase tracking-wider" title={person.name}>{person.name}</div>
          <div className="mt-1 truncate text-[10px] font-semibold text-muted-foreground uppercase tracking-widest" title={displayTitle}>{displayTitle}</div>
        </div>
      </div>
    );
  }

  if (variant === "badge") {
    const gradient = isPrimary ? "bg-gradient-to-r from-orange-400 to-pink-500" : isHead ? "bg-gradient-to-r from-pink-500 to-rose-500" : "bg-gradient-to-r from-cyan-400 to-blue-500";
    const ringColor = isPrimary ? "ring-orange-400" : isHead ? "ring-pink-500" : "ring-cyan-400";
    return (
      <div {...sharedProps} className={\`group relative flex w-56 flex-col items-center justify-center pt-2 pb-4 transition-all \${editing ? "cursor-grab" : "hover:-translate-y-1 hover:scale-105"}\`}>
        <div className={\`relative flex h-20 w-20 items-center justify-center rounded-full ring-[3px] ring-offset-[5px] ring-offset-background \${ringColor}\`}>
          <EmployeeAvatar id={person.id} name={person.name} url={person.avatarUrl} className="h-full w-full rounded-full" />
        </div>
        <div className={\`relative z-10 -mt-2 flex w-full flex-col items-center justify-center rounded-xl p-2 shadow-lg \${gradient}\`}>
          <div className={\`absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 \${gradient}\`}></div>
          <div className="relative z-10 truncate text-xs font-bold text-white uppercase tracking-wider w-full text-center" title={person.name}>{person.name}</div>
          <div className="relative z-10 mt-1 truncate rounded bg-white/25 px-2.5 py-0.5 text-[9px] font-bold text-white max-w-full" title={displayTitle}>{displayTitle}</div>
        </div>
      </div>
    );
  }

  if (variant === "vibrant") {
    const ringGradient = isPrimary ? "bg-gradient-to-tr from-pink-500 to-rose-400" : isHead ? "bg-gradient-to-tr from-orange-400 to-amber-400" : "bg-gradient-to-tr from-emerald-400 to-teal-400";
    const badgeGradient = isPrimary ? "bg-gradient-to-r from-pink-500 to-rose-500" : isHead ? "bg-gradient-to-r from-orange-400 to-orange-500" : "bg-gradient-to-r from-emerald-400 to-emerald-500";
    return (
      <div {...sharedProps} className={\`group relative flex w-52 flex-col items-center justify-center transition-all pt-2 pb-4 \${editing ? "cursor-grab" : "hover:-translate-y-1 hover:scale-105"}\`}>
        <div className={\`relative flex h-24 w-24 items-center justify-center rounded-full p-[3px] \${ringGradient}\`}>
          <div className="flex h-full w-full items-center justify-center rounded-full bg-background p-1">
            <EmployeeAvatar id={person.id} name={person.name} url={person.avatarUrl} className="h-full w-full rounded-full" />
          </div>
        </div>
        <div className={\`relative z-10 -mt-4 w-[115%] rounded-lg px-3 py-2 text-center shadow-lg \${badgeGradient}\`}>
          <div className="truncate text-[11px] font-bold text-white uppercase tracking-wider" title={person.name}>{person.name}</div>
          <div className="mt-1 truncate text-[9px] font-semibold text-white/90 uppercase" title={displayTitle}>( {displayTitle} )</div>
        </div>
      </div>
    );
  }

  const tone = isPrimary
    ? "border-brand/40 bg-gradient-to-br from-brand/10 via-card to-card shadow-[0_8px_24px_-12px_hsl(var(--brand)/0.45)]"
    : isHead
    ? "border-brand/20 bg-gradient-to-br from-brand/[0.04] via-card to-card"
    : "border-border/70 bg-card";
  const stripe = isPrimary
    ? "bg-gradient-to-r from-brand via-brand/70 to-brand/30"
    : isHead
    ? "bg-gradient-to-r from-brand/60 via-brand/30 to-transparent"
    : "bg-gradient-to-r from-border via-border/60 to-transparent";
  
  return (
    <div
      {...sharedProps}
      className={\`group relative flex w-64 flex-col overflow-hidden rounded-2xl border \${tone} backdrop-blur-sm transition-all duration-300 \${editing ? "cursor-grab active:cursor-grabbing" : "hover:-translate-y-1 hover:border-brand/50 hover:shadow-[0_16px_40px_-16px_hsl(var(--brand)/0.4)]"}\`}
    >
      <div className={\`h-1 w-full \${stripe}\`} />
      {isPrimary && (
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-foreground shadow-md">
          <Crown className="h-2.5 w-2.5" /> Lead
        </span>
      )}
      {editing && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-background/80 p-1 text-muted-foreground shadow-sm">
          <GripVertical className="h-3.5 w-3.5" />
        </span>
      )}
      <div className="flex flex-col items-center gap-3 px-4 pb-3 pt-5">
        <div className="relative">
          <div className={\`absolute -inset-1 rounded-full \${isPrimary ? "bg-gradient-to-tr from-brand/40 to-brand/10" : isHead ? "bg-gradient-to-tr from-brand/20 to-transparent" : ""}\`} />
          <EmployeeAvatar
            id={person.id}
            name={person.name}
            url={person.avatarUrl}
            className="relative h-16 w-16 ring-2 ring-background shadow-lg"
          />
          <span className="absolute bottom-0.5 right-0.5 block h-3 w-3 rounded-full border-2 border-card bg-emerald-500 shadow-sm" />
        </div>
        <div className="min-w-0 w-full text-center">
          <div className="truncate text-sm font-semibold tracking-tight text-foreground" title={person.name}>
            {person.name}
          </div>
          <div
            className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground"
            title={displayTitle}
          >
            {displayTitle}
          </div>
          {deptName && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-muted-foreground">
              <Building2 className="h-2.5 w-2.5" />
              <span className="truncate max-w-[140px]">{deptName}</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-auto border-t border-border/60 bg-muted/20 px-4 py-2.5">
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex min-w-0 flex-col gap-0.5">
            {person.email && (
              <span className="flex min-w-0 items-center gap-1.5" title={person.email}>
                <Mail className="h-3 w-3 shrink-0 text-brand/70" />
                <span className="truncate">{person.email}</span>
              </span>
            )}
            {person.phone && (
              <span className="flex min-w-0 items-center gap-1.5" title={person.phone}>
                <Phone className="h-3 w-3 shrink-0 text-brand/70" />
                <span className="truncate">{person.phone}</span>
              </span>
            )}
            {!person.email && !person.phone && (
              <span className="text-muted-foreground/60 italic">No contact info</span>
            )}
          </div>
          {!editing && (
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-hover:text-brand" />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyPositionCard({ title, variant = "default" }: { title: string; variant?: CardVariant }) {
  if (variant !== "default") {
    return (
      <div className="group relative flex w-48 flex-col items-center justify-center p-3 opacity-60 transition-all hover:opacity-100">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/50 bg-muted/30 text-muted-foreground group-hover:border-brand group-hover:text-brand">
          <UserPlus className="h-7 w-7" />
        </div>
        <div className="mt-4 text-center w-full">
          <div className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vacancy</div>
          <div className="mt-1 truncate text-xs font-semibold text-foreground uppercase tracking-wider" title={title}>{title}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="group relative flex w-64 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-border/80 bg-background/50 p-6 transition-all hover:border-brand/40 hover:bg-brand/5">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <UserPlus className="h-5 w-5 text-muted-foreground group-hover:text-brand" />
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Vacancy</p>
        <p className="mt-1 text-sm font-medium text-foreground">{title}</p>
      </div>
      <button 
        type="button"
        onClick={() => toast.info("To assign an employee, drag an Unassigned Employee card and drop it onto this position block.")}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1.5 text-[11px] font-bold text-brand hover:bg-brand hover:text-brand-foreground transition-colors">
        <Plus className="h-3.5 w-3.5" /> Assign Employee
      </button>
    </div>
  );
}

function DeptNode`;
code = code.replace(oldCardsRegex, newCards);

// 3. DeptNode props and usages
code = code.replace(
  /function DeptNode\(\{\r?\n  dept,\r?\n  query,\r?\n  onOpen,\r?\n  editing,/g,
  'function DeptNode({\n  dept,\n  query,\n  onOpen,\n  editing,\n  variant,'
);
code = code.replace(
  /  query: string;\r?\n  onOpen: \(p: OrgPerson, ctx: \{ title\?: string; deptName\?: string \}\) => void;\r?\n  editing: boolean;/g,
  '  query: string;\n  onOpen: (p: OrgPerson, ctx: { title?: string; deptName?: string }) => void;\n  editing: boolean;\n  variant: CardVariant;'
);
code = code.replace(/editing={editing}\r?\n\s+\/>/g, 'editing={editing}\n                variant={variant}\n              />');
code = code.replace(/onOpen={onOpen}\r?\n\s+onRename={onRenamePosition}/g, 'onOpen={onOpen}\n                variant={variant}\n                onRename={onRenamePosition}');

code = code.replace(/<PersonCard([^>]*?)editing={editing}\r?\n\s+\/>/g, '<PersonCard$1editing={editing}\n                variant={variant}\n              />');

// 4. PositionGroup props and usages
code = code.replace(
  /function PositionGroup\(\{\r?\n  deptId,\r?\n  deptName,\r?\n  pg,\r?\n  editing,/g,
  'function PositionGroup({\n  deptId,\n  deptName,\n  pg,\n  editing,\n  variant,'
);
code = code.replace(
  /  editing: boolean;\r?\n  onOpen:/g,
  '  editing: boolean;\n  variant: CardVariant;\n  onOpen:'
);
code = code.replace(/<EmptyPositionCard key={\`empty-\${i}\`} title={pg.name} \/>/g, '<EmptyPositionCard key={\`empty-\${i}\`} title={pg.name} variant={variant} />');
code = code.replace(/<PersonCard([^>]*?)editing={editing} \/>/g, '<PersonCard$1editing={editing} variant={variant} />');

// 5. OrgChartPage State
code = code.replace(/const \[editing, setEditing\] = useState\(false\);/g, 'const [editing, setEditing] = useState(false);\n  const [cardStyle, setCardStyle] = useState<CardVariant>("default");');

// 6. OrgChartPage JSX usages
code = code.replace(/<PersonCard\r?\n\s+person=\{data\.ceo\}[\s\S]*?editing=\{editing\}[\s\S]*?\/>/g, 
  '<PersonCard\n              person={data.ceo}\n              accent="primary"\n              title={data.ceo.positionName ?? "General Manager"}\n              deptName="Executive"\n              onOpen={openPerson}\n              editing={editing}\n              variant={cardStyle}\n            />');
            
code = code.replace(/query={q}\r?\n\s+onOpen={openPerson}\r?\n\s+editing={editing}\r?\n\s+onRename/g, 'query={q}\n                onOpen={openPerson}\n                editing={editing}\n                variant={cardStyle}\n                onRename');

// 7. Select component in header
const newHeader = `<div className="flex items-center gap-2 border-r border-border pr-4 mr-2">
            <Paintbrush className="h-4 w-4 text-muted-foreground" />
            <Select value={cardStyle} onValueChange={(v) => setCardStyle(v as CardVariant)}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Card</SelectItem>
                <SelectItem value="minimal">Minimal Theme</SelectItem>
                <SelectItem value="badge">Badge Theme</SelectItem>
                <SelectItem value="vibrant">Vibrant Theme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={editing ? "default" : "outline"}
            onClick={() => { setEditing((v) => !v); setQ(""); }}
          >
            <Pencil className="h-4 w-4" /> {editing ? "Done" : "Edit"}
          </Button>`;
code = code.replace(/<Button\s+variant={editing \? "default" : "outline"}\s+onClick={\(\) => { setEditing\(\(v\) => !v\); setQ\(""\); }}\s*>\s*<Pencil className="h-4 w-4" \/> {editing \? "Done" : "Edit"}\s*<\/Button>/, newHeader);

fs.writeFileSync(file, code);
console.log('Done replacing!');
