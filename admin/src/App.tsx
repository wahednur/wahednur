import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import Shell from "@/components/Shell";
import { Loading } from "@/components/ui";
import { AuthProvider, useAuth } from "@/lib/auth";
import Accounting from "@/pages/Accounting";
import Billing from "@/pages/Billing";
import Clients from "@/pages/Clients";
import Content from "@/pages/Content";
import ContentEditor from "@/pages/ContentEditor";
import DocumentNew from "@/pages/DocumentNew";
import Documents from "@/pages/Documents";
import InvoiceDetail from "@/pages/InvoiceDetail";
import Login from "@/pages/Login";
import Overview from "@/pages/Overview";
import ProjectDetail from "@/pages/ProjectDetail";
import Products from "@/pages/Products";
import Projects from "@/pages/Projects";
import RecurringDetail from "@/pages/RecurringDetail";
import QuotationDetail from "@/pages/QuotationDetail";
import QuotePrint from "@/pages/QuotePrint";
import Requests from "@/pages/Requests";
import Services from "@/pages/Services";
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

function BareGuard() {
  const { me, loading, isStaff } = useAuth();
  if (loading) return <div className="p-8"><Loading /></div>;
  if (!me || !isStaff) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<BareGuard />}>
            <Route path="/print/quotation/:id" element={<QuotePrint />} />
          </Route>
          <Route element={<Guard />}>
            <Route index element={<Overview />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="billing" element={<Billing />} />
            <Route path="billing/invoices/:id" element={<InvoiceDetail />} />
            <Route path="billing/quotations/:id" element={<QuotationDetail />} />
            <Route path="billing/recurring/:id" element={<RecurringDetail />} />
            <Route path="billing/new/recurring" element={<DocumentNew kind="recurring" />} />
            <Route path="billing/recurring/:id/edit" element={<DocumentNew kind="recurring" />} />
            <Route path="billing/new/quotation" element={<DocumentNew kind="quotation" />} />
            <Route path="billing/new/invoice" element={<DocumentNew kind="invoice" />} />
            <Route path="billing/quotation/:id/edit" element={<DocumentNew kind="quotation" />} />
            <Route path="billing/invoice/:id/edit" element={<DocumentNew kind="invoice" />} />
            <Route path="requests" element={<Requests />} />
            <Route path="services" element={<Services />} />
            <Route path="shop" element={<Shop />} />
            <Route path="products" element={<Products />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="documents" element={<Documents />} />
            <Route path="clients" element={<Clients />} />
            <Route path="content" element={<Content />} />
            <Route path="content/new" element={<ContentEditor />} />
            <Route path="content/:id" element={<ContentEditor />} />
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
