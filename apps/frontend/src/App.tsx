import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MainLayout } from "./components/layouts/MainLayout";
import { HomePage } from "./pages/HomePage";
import { VaultPage } from "./pages/VaultPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { NewDocumentPage } from "./pages/NewDocumentPage";
import { Toaster } from "./components/ui/sonner";
import { DocumentPage } from "./pages/DocumentPage";
import { ProfilePage } from "./pages/ProfilePage"; // <-- IMPORT THIS

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="vault" element={<VaultPage />} />
            <Route path="documents/new" element={<NewDocumentPage />} />
            <Route path="documents/:id" element={<DocumentPage />} />
            <Route path="profile" element={<ProfilePage />} />{" "}
            {/* <-- ADD THIS */}
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  );
}

export default App;
