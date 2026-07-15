import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';
import RequireSession from './RequireSession';
import Dashboard from '../pages/Dashboard/Dashboard';
import Products from '../pages/Products/Products';
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
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
