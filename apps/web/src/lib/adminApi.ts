import { apiFetch } from "./api";
import type {
  AlertItem,
  Animal,
  AnimalInput,
  AnimalPhoto,
  DashboardSummary,
  MedicalRecord,
  Medication,
  SupportRequest,
  SupportStatus,
  Vaccination,
} from "./types";

const jsonBody = (data: unknown): RequestInit => ({ body: JSON.stringify(data) });

export const adminApi = {
  // Animals
  listAnimals: () => apiFetch<Animal[]>("/api/admin/animals"),
  getAnimal: (id: string) => apiFetch<Animal>(`/api/admin/animals/${id}`),
  createAnimal: (data: AnimalInput) =>
    apiFetch<Animal>("/api/admin/animals", { method: "POST", ...jsonBody(data) }),
  updateAnimal: (id: string, data: Partial<AnimalInput>) =>
    apiFetch<Animal>(`/api/admin/animals/${id}`, { method: "PATCH", ...jsonBody(data) }),
  deleteAnimal: (id: string) =>
    apiFetch<void>(`/api/admin/animals/${id}`, { method: "DELETE" }),

  // Photos
  uploadPhoto: (animalId: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiFetch<AnimalPhoto>(`/api/admin/animals/${animalId}/photos`, {
      method: "POST",
      body,
    });
  },
  deletePhoto: (animalId: string, photoId: string) =>
    apiFetch<void>(`/api/admin/animals/${animalId}/photos/${photoId}`, { method: "DELETE" }),
  setCoverPhoto: (animalId: string, photoId: string) =>
    apiFetch<AnimalPhoto[]>(`/api/admin/animals/${animalId}/photos/${photoId}/cover`, {
      method: "PATCH",
    }),

  // Dashboard
  alerts: () => apiFetch<AlertItem[]>("/api/admin/dashboard/alerts"),
  summary: () => apiFetch<DashboardSummary>("/api/admin/dashboard/summary"),

  // Support requests
  listRequests: () => apiFetch<SupportRequest[]>("/api/admin/support-requests"),
  updateRequest: (id: string, status: SupportStatus) =>
    apiFetch<SupportRequest>(`/api/admin/support-requests/${id}`, {
      method: "PATCH",
      ...jsonBody({ status }),
    }),

  // Vaccinations
  listVaccinations: (animalId: string) =>
    apiFetch<Vaccination[]>(`/api/admin/animals/${animalId}/vaccinations`),
  createVaccination: (animalId: string, data: Partial<Vaccination>) =>
    apiFetch<Vaccination>(`/api/admin/animals/${animalId}/vaccinations`, {
      method: "POST",
      ...jsonBody(data),
    }),
  deleteVaccination: (animalId: string, id: string) =>
    apiFetch<void>(`/api/admin/animals/${animalId}/vaccinations/${id}`, { method: "DELETE" }),

  // Medications
  listMedications: (animalId: string) =>
    apiFetch<Medication[]>(`/api/admin/animals/${animalId}/medications`),
  createMedication: (animalId: string, data: Partial<Medication>) =>
    apiFetch<Medication>(`/api/admin/animals/${animalId}/medications`, {
      method: "POST",
      ...jsonBody(data),
    }),
  deleteMedication: (animalId: string, id: string) =>
    apiFetch<void>(`/api/admin/animals/${animalId}/medications/${id}`, { method: "DELETE" }),

  // Medical records
  listRecords: (animalId: string) =>
    apiFetch<MedicalRecord[]>(`/api/admin/animals/${animalId}/medical-records`),
  createRecord: (animalId: string, data: Partial<MedicalRecord>) =>
    apiFetch<MedicalRecord>(`/api/admin/animals/${animalId}/medical-records`, {
      method: "POST",
      ...jsonBody(data),
    }),
  deleteRecord: (animalId: string, id: string) =>
    apiFetch<void>(`/api/admin/animals/${animalId}/medical-records/${id}`, { method: "DELETE" }),
};
