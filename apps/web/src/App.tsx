import { Routes, Route } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { HomePage } from "./pages/public/HomePage";
import { AnimalPublicPage } from "./pages/public/AnimalPublicPage";
import { OrgPage } from "./pages/public/OrgPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { AnimalsListPage } from "./pages/admin/AnimalsListPage";
import { AnimalFormPage } from "./pages/admin/AnimalFormPage";
import { AnimalDetailPage } from "./pages/admin/AnimalDetailPage";
import { RequestsPage } from "./pages/admin/RequestsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/animais/:id" element={<AnimalPublicPage />} />
        <Route path="/ongs/:slug" element={<OrgPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrar" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/animais" element={<AnimalsListPage />} />
          <Route path="/admin/animais/novo" element={<AnimalFormPage />} />
          <Route path="/admin/animais/:id" element={<AnimalDetailPage />} />
          <Route path="/admin/animais/:id/editar" element={<AnimalFormPage />} />
          <Route path="/admin/solicitacoes" element={<RequestsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
