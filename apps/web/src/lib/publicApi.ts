import { apiFetch } from "./api";
import type { PublicAnimal, PublicAnimalDetail, PublicOrganization, SupportRequest, SupportRequestInput } from "./types";

export type VitrineFilters = {
  species?: string;
  size?: string;
  sex?: string;
  city?: string;
  org?: string;
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
  getAnimal: (id: string) => apiFetch<PublicAnimalDetail>(`/api/public/animals/${id}`),
  getOrganization: (slug: string) =>
    apiFetch<PublicOrganization>(`/api/public/organizations/${slug}`),
  createSupportRequest: (data: SupportRequestInput) =>
    apiFetch<SupportRequest>("/api/public/support-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
