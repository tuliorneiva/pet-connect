import { apiFetch } from "./api";
import type { PublicAnimal, SupportRequest, SupportRequestInput } from "./types";

export type VitrineFilters = {
  species?: string;
  size?: string;
  sex?: string;
  city?: string;
};

function toQuery(filters: VitrineFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const publicApi = {
  listAnimals: (filters: VitrineFilters = {}) =>
    apiFetch<PublicAnimal[]>(`/api/public/animals${toQuery(filters)}`),
  getAnimal: (id: number) => apiFetch<PublicAnimal>(`/api/public/animals/${id}`),
  createSupportRequest: (data: SupportRequestInput) =>
    apiFetch<SupportRequest>("/api/public/support-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
