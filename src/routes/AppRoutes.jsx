import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';
import RequireSession from './RequireSession';
import Dashboard from '../pages/Dashboard/Dashboard';
import Products from '../pages/Products/Products';
import Stock from '../pages/Stock/Stock';
import Clients from '../pages/Clients/Clients';
import Suppliers from '../pages/Suppliers/Suppliers';
import Sales from '../pages/Sales/Sales';
import NewSale from '../pages/Sales/NewSale';
import SaleDetail from '../pages/Sales/SaleDetail';
import Purchases from '../pages/Purchases/Purchases';
import NewPurchase from '../pages/Purchases/NewPurchase';
import PurchaseDetail from '../pages/Purchases/PurchaseDetail';
import Accounting from '../pages/Accounting/Accounting';
import Settings from '../pages/Settings/Settings';
import Login from '../pages/auth/Login/Login';
import Register from '../pages/auth/Register/Register';
import ForgotPassword from '../pages/auth/ForgotPassword/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword/ResetPassword';
import FinalizeRegistration from '../pages/auth/FinalizeRegistration/FinalizeRegistration';
import SubscriptionRequired from '../pages/Subscription/SubscriptionRequired';
import NotFound from '../pages/NotFound/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
        </Route>
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
      </Route>

      <Route element={<RequireSession />}>
        <Route element={<AuthLayout />}>
          <Route path="/finalisation" element={<FinalizeRegistration />} />
        </Route>
        <Route path="/abonnement-requis" element={<SubscriptionRequired />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
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
          <Route path="/parametres" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
