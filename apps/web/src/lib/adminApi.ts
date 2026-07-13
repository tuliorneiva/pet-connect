import { apiFetch } from "./api";
import type {
  AlertItem,
  Animal,
  AnimalInput,
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
  getAnimal: (id: number) => apiFetch<Animal>(`/api/admin/animals/${id}`),
  createAnimal: (data: AnimalInput) =>
    apiFetch<Animal>("/api/admin/animals", { method: "POST", ...jsonBody(data) }),
  updateAnimal: (id: number, data: Partial<AnimalInput>) =>
    apiFetch<Animal>(`/api/admin/animals/${id}`, { method: "PATCH", ...jsonBody(data) }),
  deleteAnimal: (id: number) =>
    apiFetch<void>(`/api/admin/animals/${id}`, { method: "DELETE" }),

  // Dashboard
  alerts: () => apiFetch<AlertItem[]>("/api/admin/dashboard/alerts"),
  summary: () => apiFetch<DashboardSummary>("/api/admin/dashboard/summary"),

  // Support requests
  listRequests: () => apiFetch<SupportRequest[]>("/api/admin/support-requests"),
  updateRequest: (id: number, status: SupportStatus) =>
    apiFetch<SupportRequest>(`/api/admin/support-requests/${id}`, {
      method: "PATCH",
      ...jsonBody({ status }),
    }),

  // Vaccinations
  listVaccinations: (animalId: number) =>
    apiFetch<Vaccination[]>(`/api/admin/animals/${animalId}/vaccinations`),
  createVaccination: (animalId: number, data: Partial<Vaccination>) =>
    apiFetch<Vaccination>(`/api/admin/animals/${animalId}/vaccinations`, {
      method: "POST",
      ...jsonBody(data),
    }),
  deleteVaccination: (animalId: number, id: number) =>
    apiFetch<void>(`/api/admin/animals/${animalId}/vaccinations/${id}`, { method: "DELETE" }),

  // Medications
  listMedications: (animalId: number) =>
    apiFetch<Medication[]>(`/api/admin/animals/${animalId}/medications`),
  createMedication: (animalId: number, data: Partial<Medication>) =>
    apiFetch<Medication>(`/api/admin/animals/${animalId}/medications`, {
      method: "POST",
      ...jsonBody(data),
    }),
  deleteMedication: (animalId: number, id: number) =>
    apiFetch<void>(`/api/admin/animals/${animalId}/medications/${id}`, { method: "DELETE" }),

  // Medical records
  listRecords: (animalId: number) =>
    apiFetch<MedicalRecord[]>(`/api/admin/animals/${animalId}/medical-records`),
  createRecord: (animalId: number, data: Partial<MedicalRecord>) =>
    apiFetch<MedicalRecord>(`/api/admin/animals/${animalId}/medical-records`, {
      method: "POST",
      ...jsonBody(data),
    }),
  deleteRecord: (animalId: number, id: number) =>
    apiFetch<void>(`/api/admin/animals/${animalId}/medical-records/${id}`, { method: "DELETE" }),
};
