"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createDistrict,
  createCity,
  deleteCity,
  createWeightBand,
  deleteWeightBand,
  setShippingRate,
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
  const [newCity, setNewCity] = useState<Record<string, string>>({});
  const [newBand, setNewBand] = useState({ min: "", max: "", label: "" });
  const [selectedCityId, setSelectedCityId] = useState<string>(districts[0]?.cities[0]?.id ?? "");
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Districts &amp; Cities</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="New district name" value={newDistrict} onChange={(e) => setNewDistrict(e.target.value)} />
            <Button
              disabled={isPending || !newDistrict}
              onClick={() => startTransition(async () => { await createDistrict(newDistrict); setNewDistrict(""); router.refresh(); })}
            >
              Add
            </Button>
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
                        onClick={() => startTransition(async () => { await deleteCity(c.id); router.refresh(); })}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="New city"
                    className="h-8 text-xs"
                    value={newCity[d.id] ?? ""}
                    onChange={(e) => setNewCity((s) => ({ ...s, [d.id]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    disabled={isPending || !newCity[d.id]}
                    onClick={() =>
                      startTransition(async () => {
                        await createCity(d.id, newCity[d.id]!);
                        setNewCity((s) => ({ ...s, [d.id]: "" }));
                        router.refresh();
                      })
                    }
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Weight Bands</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Min (g)" type="number" value={newBand.min} onChange={(e) => setNewBand((b) => ({ ...b, min: e.target.value }))} />
            <Input placeholder="Max (g)" type="number" value={newBand.max} onChange={(e) => setNewBand((b) => ({ ...b, max: e.target.value }))} />
            <Input placeholder="Label" value={newBand.label} onChange={(e) => setNewBand((b) => ({ ...b, label: e.target.value }))} />
          </div>
          <Button
            size="sm"
            disabled={isPending || !newBand.min || !newBand.max}
            onClick={() =>
              startTransition(async () => {
                await createWeightBand(Number(newBand.min), Number(newBand.max), newBand.label);
                setNewBand({ min: "", max: "", label: "" });
                router.refresh();
              })
            }
          >
            Add Band
          </Button>
          <ul className="space-y-1 text-sm">
            {weightBands.map((b) => (
              <li key={b.id} className="flex items-center justify-between">
                <span>{b.label || `${b.minWeightG}g – ${b.maxWeightG}g`}</span>
                <button
                  onClick={() => startTransition(async () => { await deleteWeightBand(b.id); router.refresh(); })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
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
            {districts.flatMap((d) => d.cities.map((c) => ({ ...c, districtName: d.name }))).map((c) => (
              <option key={c.id} value={c.id}>{c.districtName} — {c.name}</option>
            ))}
          </select>
          {weightBands.map((b) => {
            const key = `${selectedCityId}:${b.id}`;
            const currentValue = rateInputs[key] ?? rates[key]?.toString() ?? "";
            return (
              <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex-1">{b.label || `${b.minWeightG}g–${b.maxWeightG}g`}</span>
                <Input
                  type="number"
                  step="0.01"
                  className="w-28"
                  value={currentValue}
                  onChange={(e) => setRateInputs((s) => ({ ...s, [key]: e.target.value }))}
                  onBlur={() => {
                    const val = rateInputs[key];
                    if (val === undefined || val === "" || !selectedCityId) return;
                    startTransition(async () => { await setShippingRate(selectedCityId, b.id, Number(val)); router.refresh(); });
                  }}
                />
              </div>
            );
          })}
          {!selectedCityId && <p className="text-sm text-muted-foreground">Add a city first.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
