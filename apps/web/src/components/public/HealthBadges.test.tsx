import { render, screen } from "@testing-library/react";
import { HealthBadges } from "./HealthBadges";

test("não mostra selo de vacina quando não há registro", () => {
  render(<HealthBadges upToDate={null} underTreatment={false} />);
  expect(screen.queryByText(/vacina/i)).not.toBeInTheDocument();
});

test("mostra vacinação em dia", () => {
  render(<HealthBadges upToDate underTreatment={false} />);
  expect(screen.getByText("Vacinação em dia")).toBeInTheDocument();
});

test("mostra vacinação pendente quando há vacina vencida", () => {
  render(<HealthBadges upToDate={false} underTreatment={false} />);
  expect(screen.getByText("Vacinação pendente")).toBeInTheDocument();
});

test("mostra tratamento em curso", () => {
  render(<HealthBadges upToDate={null} underTreatment />);
  expect(screen.getByText("Em tratamento")).toBeInTheDocument();
});
