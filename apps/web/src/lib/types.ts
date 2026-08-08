export type AnimalStatus = "disponível" | "em_processo" | "adotado" | "indisponível";

export type AnimalPhoto = { id: string; url: string; sort_order: number };

export type Animal = {
  id: string;
  org_id: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  size: string | null;
  birth_estimate: string | null;
  description: string | null;
  photo_url: string | null;
  photos: string[];
  // Só a ONG precisa do id de cada foto para remover ou trocar a capa; o público
  // (PublicAnimal) só enxerga as URLs.
  photo_items: AnimalPhoto[];
  status: AnimalStatus;
  created_at: string;
};

export type PublicAnimal = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  size: string | null;
  birth_estimate: string | null;
  description: string | null;
  photo_url: string | null;
  photos: string[];
  org_id: string;
  org_name: string;
  org_city: string | null;
  org_slug: string;
};

/** O detalhe traz os sinais de saúde derivados; a listagem não os calcula. */
export type PublicAnimalDetail = PublicAnimal & {
  vaccines_up_to_date: boolean | null;
  under_treatment: boolean;
};

export type PublicOrganization = {
  id: string;
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

export type OrganizationProfile = {
  id: string;
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
};

export type OrganizationProfileInput = {
  name?: string;
  city?: string | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  founded_year?: number | null;
};

export type AnimalInput = {
  name: string;
  species: string;
  breed?: string | null;
  sex?: string | null;
  size?: string | null;
  birth_estimate?: string | null;
  description?: string | null;
  // A foto entra só por upload (adminApi.uploadPhoto); manter um campo aqui
  // criaria uma segunda fonte da verdade para a capa.
  status?: AnimalStatus;
};

export type SupportType = "adoção" | "lar_temporário" | "apadrinhamento";
export type SupportStatus = "nova" | "em_análise" | "aprovada" | "recusada" | "concluída";

export type SupportRequest = {
  id: string;
  animal_id: string | null;
  animal_name: string | null;
  org_id: string;
  type: SupportType;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  message: string | null;
  status: SupportStatus;
  created_at: string;
};

export type SupportRequestInput = {
  animal_id: string;
  type: SupportType;
  requester_name: string;
  requester_email: string;
  requester_phone?: string;
  message?: string;
};

export type Vaccination = {
  id: string;
  animal_id: string;
  vaccine_name: string;
  applied_at: string | null;
  due_at: string | null;
  notes: string | null;
};

export type Medication = {
  id: string;
  animal_id: string;
  name: string;
  dosage: string | null;
  start_at: string | null;
  end_at: string | null;
  next_dose_at: string | null;
  status: string;
  notes: string | null;
};

export type MedicalRecord = {
  id: string;
  animal_id: string;
  title: string;
  description: string | null;
  recorded_at: string | null;
  created_by: number | null;
};

export type AlertItem = {
  animal_id: string;
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
