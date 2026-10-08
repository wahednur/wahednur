import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Shell from "@/components/Shell";
import { Loading } from "@/components/ui";
import { AuthProvider, useAuth } from "@/lib/auth";
import Accounting from "@/pages/Accounting";
import Billing from "@/pages/Billing";
import Clients from "@/pages/Clients";
import Content from "@/pages/Content";
import InvoiceDetail from "@/pages/InvoiceDetail";
import Login from "@/pages/Login";
import Overview from "@/pages/Overview";
import Projects from "@/pages/Projects";
import Requests from "@/pages/Requests";
import Shop from "@/pages/Shop";
import Subscriptions from "@/pages/Subscriptions";

/** Only staff get past this. The API checks again on every call; this just avoids showing empty screens. */
function Guard({ owner }: { owner?: boolean }) {
  const { me, loading, isStaff, isOwner } = useAuth();
  if (loading) return <div className="p-8"><Loading /></div>;
  if (!me || !isStaff) return <Navigate to="/login" replace />;
  if (owner && !isOwner) return <Navigate to="/" replace />;
  return <Shell />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Guard />}>
            <Route index element={<Overview />} />
            <Route path="projects" element={<Projects />} />
            <Route path="billing" element={<Billing />} />
            <Route path="billing/invoices/:id" element={<InvoiceDetail />} />
            <Route path="requests" element={<Requests />} />
            <Route path="shop" element={<Shop />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="clients" element={<Clients />} />
            <Route path="content" element={<Content />} />
          </Route>
          <Route element={<Guard owner />}>
            <Route path="accounting" element={<Accounting />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
