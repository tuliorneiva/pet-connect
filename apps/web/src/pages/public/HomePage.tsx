import { useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../../lib/publicApi";
import type { VitrineFilters } from "../../lib/publicApi";
import { useAsync } from "../../lib/useAsync";
import { SEX_OPTIONS, SIZE_OPTIONS, SPECIES_OPTIONS } from "../../lib/labels";
import { Select } from "../../components/ui/Select";
import { Field } from "../../components/ui/Field";
import styles from "./public.module.css";

export function HomePage() {
  const [filters, setFilters] = useState<VitrineFilters>({});
  const { data, loading, error } = useAsync(
    () => publicApi.listAnimals(filters),
    [filters.species, filters.size, filters.sex, filters.city],
  );

  function set(key: keyof VitrineFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  return (
    <div>
      <div className={styles.hero}>
        <h1>Adote um amigo</h1>
        <p className={styles.subtitle}>Conheça os animais que estão à espera de um novo lar.</p>
      </div>

      <div className={styles.filters}>
        <Select label="Espécie" options={SPECIES_OPTIONS} placeholder="Todas" value={filters.species ?? ""} onChange={(e) => set("species", e.target.value)} />
        <Select label="Porte" options={SIZE_OPTIONS} placeholder="Todos" value={filters.size ?? ""} onChange={(e) => set("size", e.target.value)} />
        <Select label="Sexo" options={SEX_OPTIONS} placeholder="Todos" value={filters.sex ?? ""} onChange={(e) => set("sex", e.target.value)} />
        <Field label="Cidade" value={filters.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Qualquer" />
      </div>

      {loading && <p className={styles.empty}>Carregando animais…</p>}
      {error && <p className={styles.empty}>{error}</p>}
      {data && data.length === 0 && (
        <div className={styles.empty}>Nenhum animal disponível com esses filtros no momento.</div>
      )}
      {data && data.length > 0 && (
        <div className={styles.grid}>
          {data.map((a) => (
            <Link to={`/animais/${a.id}`} key={a.id} className={styles.card}>
              {a.photo_url ? (
                <img className={styles.photo} src={a.photo_url} alt={a.name} />
              ) : (
                <div className={styles.noPhoto}>🐾</div>
              )}
              <div className={styles.cardBody}>
                <div className={styles.cardName}>{a.name}</div>
                <div className={styles.cardMeta}>
                  {a.species}
                  {a.size ? ` · ${a.size}` : ""}
                  {a.sex ? ` · ${a.sex}` : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
