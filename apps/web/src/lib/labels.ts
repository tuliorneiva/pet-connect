import type { AnimalStatus, SupportStatus, SupportType } from "./types";

export const ANIMAL_STATUS_OPTIONS: { value: AnimalStatus; label: string }[] = [
  { value: "disponível", label: "Disponível" },
  { value: "em_processo", label: "Em processo" },
  { value: "adotado", label: "Adotado" },
  { value: "indisponível", label: "Indisponível" },
];

export const SPECIES_OPTIONS = [
  { value: "cão", label: "Cão" },
  { value: "gato", label: "Gato" },
  { value: "outro", label: "Outro" },
];

export const SIZE_OPTIONS = [
  { value: "P", label: "Pequeno" },
  { value: "M", label: "Médio" },
  { value: "G", label: "Grande" },
];

export const SEX_OPTIONS = [
  { value: "macho", label: "Macho" },
  { value: "fêmea", label: "Fêmea" },
];

export const SUPPORT_TYPE_LABELS: Record<SupportType, string> = {
  adoção: "Adoção",
  lar_temporário: "Lar temporário",
  apadrinhamento: "Apadrinhamento",
};

export const SUPPORT_STATUS_OPTIONS: { value: SupportStatus; label: string }[] = [
  { value: "nova", label: "Nova" },
  { value: "em_análise", label: "Em análise" },
  { value: "aprovada", label: "Aprovada" },
  { value: "recusada", label: "Recusada" },
  { value: "concluída", label: "Concluída" },
];

export function animalStatusLabel(status: AnimalStatus): string {
  return ANIMAL_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function speciesLabel(value: string): string {
  return SPECIES_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function sexLabel(value: string): string {
  return SEX_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function sizeLabel(value: string): string {
  return SIZE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function animalStatusTone(status: AnimalStatus): "success" | "info" | "neutral" {
  if (status === "disponível") return "success";
  if (status === "em_processo") return "info";
  return "neutral";
}
