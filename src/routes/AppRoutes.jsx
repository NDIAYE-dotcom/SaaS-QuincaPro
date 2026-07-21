import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import SuperAdminLayout from '../layouts/SuperAdminLayout';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';
import RequireSession from './RequireSession';
import SuperAdminRoute from './SuperAdminRoute';
import TenantRoute from './TenantRoute';
import HomeRoute from './HomeRoute';
import LoadingScreen from '../shared/LoadingScreen';

// Chaque page dans son propre chunk : un utilisateur qui se connecte pour vendre n'a pas besoin
// de télécharger le code de Comptabilité, Rapports ou Super Admin avant de voir quoi que ce soit.
const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'));
const Products = lazy(() => import('../pages/Products/Products'));
const Stock = lazy(() => import('../pages/Stock/Stock'));
const Clients = lazy(() => import('../pages/Clients/Clients'));
const Suppliers = lazy(() => import('../pages/Suppliers/Suppliers'));
const Sales = lazy(() => import('../pages/Sales/Sales'));
const NewSale = lazy(() => import('../pages/Sales/NewSale'));
const SaleDetail = lazy(() => import('../pages/Sales/SaleDetail'));
const Purchases = lazy(() => import('../pages/Purchases/Purchases'));
const NewPurchase = lazy(() => import('../pages/Purchases/NewPurchase'));
const PurchaseDetail = lazy(() => import('../pages/Purchases/PurchaseDetail'));
const Accounting = lazy(() => import('../pages/Accounting/Accounting'));
const Reports = lazy(() => import('../pages/Reports/Reports'));
const Settings = lazy(() => import('../pages/Settings/Settings'));
const Team = lazy(() => import('../pages/Team/Team'));
const Login = lazy(() => import('../pages/auth/Login/Login'));
const Register = lazy(() => import('../pages/auth/Register/Register'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword/ResetPassword'));
const FinalizeRegistration = lazy(() => import('../pages/auth/FinalizeRegistration/FinalizeRegistration'));
const AcceptInvitation = lazy(() => import('../pages/auth/AcceptInvitation/AcceptInvitation'));
const SubscriptionRequired = lazy(() => import('../pages/Subscription/SubscriptionRequired'));
const AccountDisabled = lazy(() => import('../pages/AccountDisabled/AccountDisabled'));
const SuperAdminDashboard = lazy(() => import('../pages/SuperAdmin/SuperAdminDashboard'));
const SuperAdminEntreprises = lazy(() => import('../pages/SuperAdmin/Entreprises'));
const SuperAdminAnnonces = lazy(() => import('../pages/SuperAdmin/Annonces'));
const NotFound = lazy(() => import('../pages/NotFound/NotFound'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />

        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/connexion" element={<Login />} />
            <Route path="/inscription" element={<Register />} />
            <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
          </Route>
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
          <Route path="/invitation/:token" element={<AcceptInvitation />} />
        </Route>

        <Route element={<RequireSession />}>
          <Route element={<AuthLayout />}>
            <Route path="/finalisation" element={<FinalizeRegistration />} />
          </Route>
          <Route path="/abonnement-requis" element={<SubscriptionRequired />} />
          <Route path="/compte-desactive" element={<AccountDisabled />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<SuperAdminRoute />}>
            <Route element={<SuperAdminLayout />}>
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/super-admin/entreprises" element={<SuperAdminEntreprises />} />
              <Route path="/super-admin/annonces" element={<SuperAdminAnnonces />} />
            </Route>
          </Route>

          <Route element={<TenantRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/tableau-de-bord" element={<Dashboard />} />
              <Route path="/produits" element={<Products />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/fournisseurs" element={<Suppliers />} />
              <Route path="/ventes" element={<Sales />} />
              <Route path="/ventes/nouvelle" element={<NewSale />} />
              <Route path="/ventes/:id" element={<SaleDetail />} />
              <Route path="/achats" element={<Purchases />} />
              <Route path="/achats/nouveau" element={<NewPurchase />} />
              <Route path="/achats/:id" element={<PurchaseDetail />} />
              <Route path="/comptabilite" element={<Accounting />} />
              <Route path="/rapports" element={<Reports />} />
              <Route path="/equipe" element={<Team />} />
              <Route path="/parametres" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
