import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Plane, Save, MapPin, Plus, Trash2, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";

export function TripAllowancesTab() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data: policies, isLoading: loadingPolicies } = useQuery({
    queryKey: ["trip-allowance-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_allowance_policies")
        .select(`
          id,
          job_grade,
          nightly_rate,
          city_id,
          cities ( name_en, name_ar )
        `);
      if (error) throw error;
      return data;
    },
  });

  const { data: cities } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cities").select("id, name_en, name_ar").order("name_en");
      if (error) throw error;
      return data;
    },
  });

  const activeGrades = useMemo(() => ["Manager", "Engineer", "Technician", "Supervisor", "Driver"], []);

  // Group policies by city_id
  const groupedPolicies = useMemo(() => {
    if (!policies) return [];
    const map = new Map<string, { city_id: string; city: any; rates: Record<string, number> }>();
    for (const p of policies) {
      if (!map.has(p.city_id)) {
        map.set(p.city_id, { city_id: p.city_id, city: p.cities, rates: {} });
      }
      map.get(p.city_id)!.rates[p.job_grade] = Number(p.nightly_rate);
    }
    return Array.from(map.values()).sort((a, b) => 
      (a.city?.name_en || "").localeCompare(b.city?.name_en || "")
    );
  }, [policies]);

  const upsertMutation = useMutation({
    mutationFn: async ({ city_id, rates }: { city_id: string; rates: Record<string, number> }) => {
      const rows = Object.entries(rates).map(([grade, rate]) => ({
        city_id, job_grade: grade, nightly_rate: rate
      }));
      const { error } = await supabase
        .from("trip_allowance_policies")
        .upsert(rows, { onConflict: "city_id, job_grade" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["trip-allowance-policies"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCityPoliciesMutation = useMutation({
    mutationFn: async (city_id: string) => {
      const { error } = await supabase.from("trip_allowance_policies").delete().eq("city_id", city_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["trip-allowance-policies"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [newCityId, setNewCityId] = useState("");
  const [newRates, setNewRates] = useState<Record<string, string>>({});

  const handleAdd = () => {
    if (!newCityId) return toast.error("Please select a city");
    if (!Object.values(newRates).some(r => Number(r) > 0)) return toast.error("Please fill at least one rate");
    
    const rates: Record<string, number> = {};
    for (const g of activeGrades) rates[g] = Number(newRates[g]) || 0;

    upsertMutation.mutate({ 
      city_id: newCityId, 
      rates
    }, {
      onSuccess: () => {
        setNewCityId("");
        setNewRates({ Manager: "", Engineer: "", Technician: "", Supervisor: "", Driver: "" });
      }
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const header = ["City", "Manager", "Engineer", "Technician", "Supervisor", "Driver"];
    const data = [
      header,
      ["Cairo", 500, 400, 300, 350, 250],
      ["Alexandria", 600, 450, 350, 400, 300],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Trip_Allowances_Template.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (!cities) throw new Error("Cities not loaded yet");

        const rowsToUpsert: { city_id: string; job_grade: string; nightly_rate: number }[] = [];
        let skippedCities = 0;

        for (const row of data) {
          const cityName = row["City"];
          if (!cityName) continue;

          // Find matching city (case insensitive match on name_en or name_ar)
          const matchedCity = cities.find(
            (c) =>
              c.name_en?.toLowerCase() === String(cityName).toLowerCase() ||
              c.name_ar?.toLowerCase() === String(cityName).toLowerCase()
          );

          if (!matchedCity) {
            skippedCities++;
            continue;
          }

          for (const grade of activeGrades) {
            const rate = Number(row[grade]);
            if (!isNaN(rate) && rate >= 0) {
              rowsToUpsert.push({
                city_id: matchedCity.id,
                job_grade: grade,
                nightly_rate: rate,
              });
            }
          }
        }

        if (rowsToUpsert.length === 0) {
          toast.error("No valid data found to import.");
          return;
        }

        const { error } = await supabase
          .from("trip_allowance_policies")
          .upsert(rowsToUpsert, { onConflict: "city_id, job_grade" });

        if (error) throw error;

        toast.success(`Imported policies. ${skippedCities > 0 ? `Skipped ${skippedCities} unrecognized cities.` : ""}`);
        qc.invalidateQueries({ queryKey: ["trip-allowance-policies"] });
      } catch (err: any) {
        toast.error("Failed to import: " + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  if (loadingPolicies) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Plane className="h-6 w-6 text-brand" />
            Trip Allowances Policy
          </h1>
          <p className="text-sm text-muted-foreground">Manage the overnight allowance rates based on destination city and job grade.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90"
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </button>
          <input
            type="file"
            accept=".xlsx, .xls"
            ref={fileInputRef}
            onChange={handleImportExcel}
            className="hidden"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 font-medium text-muted-foreground">
              <tr>
              <th className="px-4 py-3 text-start">City</th>
              {activeGrades.map(g => (
                <th key={g} className="px-4 py-3 text-start">{g} Rate</th>
              ))}
              <th className="w-20 px-4 py-3" />
            </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groupedPolicies.map((group) => (
                <CityPolicyRow
                  key={group.city_id}
                  group={group}
                  activeGrades={activeGrades}
                  onSave={(rates) => upsertMutation.mutate({ city_id: group.city_id, rates })}
                  onDelete={() => deleteCityPoliciesMutation.mutate(group.city_id)}
                />
              ))}
              
              {/* Add New Row */}
              <tr className="bg-muted/10">
                <td className="p-3 pl-6">
                  <select value={newCityId} onChange={(e) => setNewCityId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand">
                    <option value="">Select City...</option>
                    {cities?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name_en || c.name_ar}</option>
                    ))}
                  </select>
                </td>
                {activeGrades.map(g => (
                <td key={g} className="px-4 py-3">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      className="w-24 rounded-lg border border-border bg-card px-3 py-1.5 text-xs focus:border-brand focus:outline-none"
                      value={newRates[g] ?? ""}
                      onChange={(e) => setNewRates({ ...newRates, [g]: e.target.value })}
                      placeholder="0"
                    />
                    </div>
                </td>
              ))}
                <td className="p-3 text-center">
                  <button onClick={handleAdd} disabled={upsertMutation.isPending} className="rounded-lg bg-brand p-1.5 text-brand-foreground hover:bg-brand/90 disabled:opacity-50" title="Add Policy">
                    <Plus className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CityPolicyRow({ group, activeGrades, onSave, onDelete }: { group: any; activeGrades: string[]; onSave: (rates: Record<string, number>) => void; onDelete: () => void }) {
  const [editedRates, setEditedRates] = useState<Record<string, string>>({});
  const currentRates = group.rates;

  const isDirty = activeGrades.some(g => 
    editedRates[`${group.city_id}-${g}`] !== undefined && 
    Number(editedRates[`${group.city_id}-${g}`]) !== (currentRates[g] || 0)
  );

  const handleSave = () => {
    const rates: Record<string, number> = {};
    for (const g of activeGrades) {
      rates[g] = Number(editedRates[`${group.city_id}-${g}`] ?? currentRates[g] ?? 0);
    }
    onSave(rates);
    setEditedRates({});
  };

  return (
    <tr className="hover:bg-muted/20">
      <td className="p-4 pl-6 font-medium">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {group.city?.name_en || group.city?.name_ar || "Unknown City"}
        </div>
      </td>
      {activeGrades.map(g => (
        <td key={g} className="px-4 py-3">
          <div className="relative">
            <input
              type="number"
              min="0"
              className="w-24 rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs focus:border-brand focus:outline-none"
              value={editedRates[`${group.city_id}-${g}`] ?? currentRates[g] ?? ""}
              onChange={(e) => setEditedRates({ ...editedRates, [`${group.city_id}-${g}`]: e.target.value })}
              placeholder="0"
            />
            </div>
        </td>
      ))}
      <td className="p-3">
        <div className="flex items-center justify-center gap-2">
          {isDirty ? (
            <button onClick={handleSave} className="rounded-lg bg-brand p-1.5 text-brand-foreground hover:bg-brand/90 shadow-brand" title="Save changes">
              <Save className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={onDelete} className="rounded-lg border border-transparent p-1.5 text-danger hover:bg-danger/10" title="Remove City Policy">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
