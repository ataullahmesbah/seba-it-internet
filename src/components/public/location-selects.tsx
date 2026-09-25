"use client";

import { useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";

export interface Loc {
  id: string;
  nameEn: string;
  nameBn: string;
}

const cache = new Map<string, Loc[]>();
async function fetchList(url: string): Promise<Loc[]> {
  if (cache.has(url)) return cache.get(url)!;
  const res = await fetch(url).then((r) => r.json()).catch(() => null);
  const list: Loc[] = res?.success ? res.data : [];
  cache.set(url, list);
  return list;
}

export interface LocationValue {
  districtId: string;
  thanaId: string;
  areaId: string;
}

/** Dependent District → Thana/Upazila → Area selects backed by the public coverage API (fetched on change). */
export function useLocation(initialDistricts: Loc[]) {
  const [value, setValue] = useState<LocationValue>({ districtId: "", thanaId: "", areaId: "" });
  const [thanas, setThanas] = useState<Loc[]>([]);
  const [areas, setAreas] = useState<Loc[]>([]);
  const [loading, setLoading] = useState<"thana" | "area" | null>(null);

  const setDistrict = (districtId: string) => {
    setValue({ districtId, thanaId: "", areaId: "" });
    setThanas([]);
    setAreas([]);
    if (!districtId) return;
    setLoading("thana");
    void fetchList(`/api/v1/public/coverage/thanas?districtId=${encodeURIComponent(districtId)}`).then((l) => {
      setThanas(l);
      setLoading(null);
    });
  };

  const setThana = (thanaId: string) => {
    setValue((v) => ({ ...v, thanaId, areaId: "" }));
    setAreas([]);
    if (!thanaId) return;
    setLoading("area");
    void fetchList(`/api/v1/public/coverage/areas?thanaId=${encodeURIComponent(thanaId)}`).then((l) => {
      setAreas(l);
      setLoading(null);
    });
  };

  return {
    value,
    districts: initialDistricts,
    thanas,
    areas,
    loading,
    setDistrict,
    setThana,
    setArea: (areaId: string) => setValue((v) => ({ ...v, areaId })),
  };
}

export function locName(l: Loc | undefined, locale: AppLocale) {
  if (!l) return "";
  return locale === "bn" ? l.nameBn || l.nameEn : l.nameEn;
}
