"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createDistrict,
  createCity,
  deleteCity,
  createWeightBand,
  deleteWeightBand,
  setShippingRate,
  deleteShippingRate,
} from "@/lib/shipping/admin-actions";

export interface District {
  id: string;
  name: string;
  cities: { id: string; name: string }[];
}
export interface WeightBand {
  id: string;
  minWeightG: number;
  maxWeightG: number;
  label: string | null;
}
export interface RateMap {
  [cityIdAndBandId: string]: number;
}

type Feedback = { type: "success" | "error"; text: string };

export function ShippingManager({
  districts,
  weightBands,
  rates,
}: {
  districts: District[];
  weightBands: WeightBand[];
  rates: RateMap;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newDistrict, setNewDistrict] = useState("");
  const [districtFeedback, setDistrictFeedback] = useState<Feedback | null>(null);
  const [newCity, setNewCity] = useState<Record<string, string>>({});
  const [cityFeedback, setCityFeedback] = useState<Record<string, Feedback>>({});
  const [newBand, setNewBand] = useState({ min: "", max: "", label: "" });
  const [bandFeedback, setBandFeedback] = useState<Feedback | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string>(districts[0]?.cities[0]?.id ?? "");
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});
  const [savingRate, setSavingRate] = useState<string | null>(null); // key currently being saved, for per-row disable/spinner
  const [rateFeedback, setRateFeedback] = useState<Record<string, Feedback>>({});

  function handleAddDistrict() {
    const name = newDistrict.trim();
    if (!name) return;
    setDistrictFeedback(null);
    startTransition(async () => {
      const result = await createDistrict(name);
      if (!result.ok) {
        setDistrictFeedback({ type: "error", text: result.error });
        return;
      }
      setNewDistrict("");
      setDistrictFeedback({ type: "success", text: "District added" });
      router.refresh();
    });
  }

  function handleAddCity(districtId: string) {
    const name = (newCity[districtId] ?? "").trim();
    if (!name) return;
    const district = districts.find((d) => d.id === districtId);
    if (district?.cities.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setCityFeedback((s) => ({ ...s, [districtId]: { type: "error", text: `"${name}" already exists in this district` } }));
      return;
    }
    setCityFeedback((s) => ({ ...s, [districtId]: undefined as unknown as Feedback }));
    startTransition(async () => {
      const result = await createCity(districtId, name);
      if (!result.ok) {
        setCityFeedback((s) => ({ ...s, [districtId]: { type: "error", text: result.error } }));
        return;
      }
      setNewCity((s) => ({ ...s, [districtId]: "" }));
      setCityFeedback((s) => ({ ...s, [districtId]: { type: "success", text: "City added" } }));
      router.refresh();
    });
  }

  function handleDeleteCity(id: string) {
    if (!window.confirm("Remove this city and its shipping rates?")) return;
    startTransition(async () => {
      const result = await deleteCity(id);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      if (selectedCityId === id) setSelectedCityId("");
      router.refresh();
    });
  }

  function handleAddBand() {
    const min = Number(newBand.min);
    const max = Number(newBand.max);
    setBandFeedback(null);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0) {
      setBandFeedback({ type: "error", text: "Enter valid, non-negative min/max weights" });
      return;
    }
    if (max <= min) {
      setBandFeedback({ type: "error", text: "Max weight must be greater than min weight" });
      return;
    }
    startTransition(async () => {
      const result = await createWeightBand(min, max, newBand.label);
      if (!result.ok) {
        setBandFeedback({ type: "error", text: result.error });
        return;
      }
      setNewBand({ min: "", max: "", label: "" });
      setBandFeedback({ type: "success", text: "Weight band added" });
      router.refresh();
    });
  }

  function handleDeleteBand(id: string) {
    if (!window.confirm("Remove this weight band? Any rates set for it will also be removed.")) return;
    startTransition(async () => {
      const result = await deleteWeightBand(id);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleSaveRate(bandId: string) {
    const key = `${selectedCityId}:${bandId}`;
    const raw = rateInputs[key];
    setRateFeedback((s) => ({ ...s, [key]: undefined as unknown as Feedback }));

    if (!selectedCityId) {
      setRateFeedback((s) => ({ ...s, [key]: { type: "error", text: "Select a city first" } }));
      return;
    }
    const value = Number(raw);
    if (raw === undefined || raw.trim() === "" || !Number.isFinite(value) || value < 0) {
      setRateFeedback((s) => ({ ...s, [key]: { type: "error", text: "Enter a valid, non-negative rate" } }));
      return;
    }

    setSavingRate(key);
    startTransition(async () => {
      const result = await setShippingRate(selectedCityId, bandId, value);
      setSavingRate(null);
      if (!result.ok) {
        setRateFeedback((s) => ({ ...s, [key]: { type: "error", text: result.error } }));
        return;
      }
      setRateFeedback((s) => ({ ...s, [key]: { type: "success", text: "Saved" } }));
      router.refresh();
    });
  }

  function handleDeleteRate(bandId: string) {
    const key = `${selectedCityId}:${bandId}`;
    if (!window.confirm("Remove this rate for the selected city?")) return;
    setSavingRate(key);
    startTransition(async () => {
      const result = await deleteShippingRate(selectedCityId, bandId);
      setSavingRate(null);
      if (!result.ok) {
        setRateFeedback((s) => ({ ...s, [key]: { type: "error", text: result.error } }));
        return;
      }
      setRateInputs((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
      setRateFeedback((s) => ({ ...s, [key]: { type: "success", text: "Rate removed" } }));
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Districts &amp; Cities</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex gap-2">
              <Input placeholder="New district name" value={newDistrict} onChange={(e) => setNewDistrict(e.target.value)} />
              <Button disabled={isPending || !newDistrict.trim()} onClick={handleAddDistrict}>
                Add
              </Button>
            </div>
            {districtFeedback && <FeedbackLine feedback={districtFeedback} />}
          </div>
          <div className="max-h-96 space-y-4 overflow-y-auto">
            {districts.map((d) => (
              <div key={d.id} className="rounded-md border p-3">
                <p className="font-medium">{d.name}</p>
                <ul className="mt-2 space-y-1">
                  {d.cities.map((c) => (
                    <li key={c.id} className="flex items-center justify-between text-sm">
                      <button
                        className={`text-left hover:text-accent ${selectedCityId === c.id ? "font-medium text-accent" : ""}`}
                        onClick={() => setSelectedCityId(c.id)}
                      >
                        {c.name}
                      </button>
                      <button
                        onClick={() => handleDeleteCity(c.id)}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                        aria-label={`Remove ${c.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                  {d.cities.length === 0 && <li className="text-xs text-muted-foreground">No cities yet.</li>}
                </ul>
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="New city"
                    className="h-8 text-xs"
                    value={newCity[d.id] ?? ""}
                    onChange={(e) => setNewCity((s) => ({ ...s, [d.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCity(d.id)}
                  />
                  <Button size="sm" disabled={isPending || !(newCity[d.id] ?? "").trim()} onClick={() => handleAddCity(d.id)}>
                    Add
                  </Button>
                </div>
                {cityFeedback[d.id] && <FeedbackLine feedback={cityFeedback[d.id]!} />}
              </div>
            ))}
            {districts.length === 0 && <p className="text-sm text-muted-foreground">No districts yet.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Weight Bands</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Min (g)" type="number" min="0" value={newBand.min} onChange={(e) => setNewBand((b) => ({ ...b, min: e.target.value }))} />
            <Input placeholder="Max (g)" type="number" min="0" value={newBand.max} onChange={(e) => setNewBand((b) => ({ ...b, max: e.target.value }))} />
            <Input placeholder="Label" value={newBand.label} onChange={(e) => setNewBand((b) => ({ ...b, label: e.target.value }))} />
          </div>
          <Button size="sm" disabled={isPending || !newBand.min || !newBand.max} onClick={handleAddBand}>
            Add Band
          </Button>
          {bandFeedback && <FeedbackLine feedback={bandFeedback} />}
          <ul className="space-y-1 text-sm">
            {weightBands.map((b) => (
              <li key={b.id} className="flex items-center justify-between">
                <span>{b.label || `${b.minWeightG}g – ${b.maxWeightG}g`}</span>
                <button
                  onClick={() => handleDeleteBand(b.id)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                  aria-label="Remove weight band"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
            {weightBands.length === 0 && <li className="text-xs text-muted-foreground">No weight bands yet.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rates for Selected City</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value)}
          >
            <option value="">— Select a city —</option>
            {districts.flatMap((d) => d.cities.map((c) => ({ ...c, districtName: d.name }))).map((c) => (
              <option key={c.id} value={c.id}>{c.districtName} — {c.name}</option>
            ))}
          </select>

          {selectedCityId && weightBands.map((b) => {
            const key = `${selectedCityId}:${b.id}`;
            const currentValue = rateInputs[key] ?? rates[key]?.toString() ?? "";
            const hasSavedRate = rates[key] != null;
            const saving = savingRate === key;
            return (
              <div key={b.id} className="border-b pb-2 last:border-b-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{b.label || `${b.minWeightG}g–${b.maxWeightG}g`}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-24"
                    value={currentValue}
                    onChange={(e) => setRateInputs((s) => ({ ...s, [key]: e.target.value }))}
                  />
                  <Button size="sm" disabled={saving} onClick={() => handleSaveRate(b.id)}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                  {hasSavedRate && (
                    <button
                      onClick={() => handleDeleteRate(b.id)}
                      disabled={saving}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                      aria-label="Remove rate"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {rateFeedback[key] && <FeedbackLine feedback={rateFeedback[key]!} />}
              </div>
            );
          })}
          {!selectedCityId && <p className="text-sm text-muted-foreground">Select (or add) a city first.</p>}
          {selectedCityId && weightBands.length === 0 && (
            <p className="text-sm text-muted-foreground">Add at least one weight band to set rates.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  return (
    <p className={cn("mt-1 text-xs", feedback.type === "success" ? "text-emerald-600" : "text-destructive")}>
      {feedback.text}
    </p>
  );
}
