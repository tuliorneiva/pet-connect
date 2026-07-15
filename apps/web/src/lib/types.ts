export type AnimalStatus = "disponível" | "em_processo" | "adotado" | "indisponível";

export type Animal = {
  id: number;
  org_id: number;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  size: string | null;
  birth_estimate: string | null;
  description: string | null;
  photo_url: string | null;
  status: AnimalStatus;
  created_at: string;
};

export type PublicAnimal = {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  size: string | null;
  birth_estimate: string | null;
  description: string | null;
  photo_url: string | null;
  org_id: number;
  org_name: string;
  org_city: string | null;
  org_slug: string;
};

export type PublicOrganization = {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  founded_year: number | null;
  verified: boolean;
  logo_url: string | null;
  created_at: string;
  available_count: number;
  adopted_count: number;
};

export type AnimalInput = {
  name: string;
  species: string;
  breed?: string | null;
  sex?: string | null;
  size?: string | null;
  birth_estimate?: string | null;
  description?: string | null;
  photo_url?: string | null;
  status?: AnimalStatus;
};

export type SupportType = "adoção" | "lar_temporário" | "apadrinhamento";
export type SupportStatus = "nova" | "em_análise" | "aprovada" | "recusada" | "concluída";

export type SupportRequest = {
  id: number;
  animal_id: number;
  org_id: number;
  type: SupportType;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  message: string | null;
  status: SupportStatus;
  created_at: string;
};

export type SupportRequestInput = {
  animal_id: number;
  type: SupportType;
  requester_name: string;
  requester_email: string;
  requester_phone?: string;
  message?: string;
};

export type Vaccination = {
  id: number;
  animal_id: number;
  vaccine_name: string;
  applied_at: string | null;
  due_at: string | null;
  notes: string | null;
};

export type Medication = {
  id: number;
  animal_id: number;
  name: string;
  dosage: string | null;
  start_at: string | null;
  end_at: string | null;
  next_dose_at: string | null;
  status: string;
  notes: string | null;
};

export type MedicalRecord = {
  id: number;
  animal_id: number;
  title: string;
  description: string | null;
  recorded_at: string | null;
  created_by: number | null;
};

export type AlertItem = {
  animal_id: number;
  animal_name: string;
  kind: string;
  description: string;
  level: "pendente" | "atrasado";
  due_at: string | null;
};

export type DashboardSummary = {
  animals_total: number;
  animals_available: number;
  animals_adopted: number;
  new_requests: number;
  alerts: number;
};
