import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import { Shell, useLoad } from './ui'
import { api } from './api'
import Login from './pages/Login'
import SellerRegister from './pages/SellerRegister'
import Forgot from './pages/Forgot'
import { Privacy, Terms } from './pages/Legal'
import SellerDashboard from './pages/seller/Dashboard'
import SellerProducts from './pages/seller/Products'
import ProductForm from './pages/seller/ProductForm'
import SellerOrders from './pages/seller/Orders'
import SellerEarnings from './pages/seller/Earnings'
import SellerProfile from './pages/seller/Profile'
import AdminDashboard from './pages/admin/Dashboard'
import AdminSellers from './pages/admin/Sellers'
import AdminProducts from './pages/admin/Products'
import AdminOrders from './pages/admin/Orders'
import AdminPayouts from './pages/admin/Payouts'
import AdminSettings from './pages/admin/Settings'
import AdminReviews from './pages/admin/Reviews'
import AdminIntegrations from './pages/admin/Integrations'
import AdminProductDetail from './pages/admin/ProductDetail'
import AdminSellerDetail from './pages/admin/SellerDetail'
import AdminOrderDetail from './pages/admin/OrderDetail'
import SellerOrderDetail from './pages/seller/OrderDetail'
import SellerProductView from './pages/seller/ProductView'

function Home() {
  const { me } = useAuth()
  if (!me) return <Navigate to="/login" replace />
  if (me.role === 'admin') return <Navigate to="/admin" replace />
  if (me.role === 'seller') return <Navigate to="/seller" replace />
  return <Navigate to="/login?buyer=1" replace />
}

function SellerArea() {
  const { me } = useAuth()
  if (me?.role !== 'seller') return <Navigate to="/login" replace />
  return (
    <Shell
      role="Seller Hub"
      links={[
        { to: '/seller', label: 'Dashboard' },
        { to: '/seller/products', label: 'Products' },
        { to: '/seller/orders', label: 'Orders' },
        { to: '/seller/earnings', label: 'Earnings & payouts' },
        { to: '/seller/profile', label: 'Business & KYC' },
      ]}
    />
  )
}

function AdminArea() {
  const { me } = useAuth()
  const { data } = useLoad(() => (me?.role === 'admin' ? api('/admin/stats') : Promise.resolve(null)), [me])
  if (me?.role !== 'admin') return <Navigate to="/login" replace />
  return (
    <Shell
      role="Admin Console"
      links={[
        { to: '/admin', label: 'Dashboard' },
        { to: '/admin/sellers', label: 'Sellers & KYC', count: data?.pending_sellers },
        { to: '/admin/products', label: 'Product approvals', count: data?.pending_products },
        { to: '/admin/orders', label: 'Orders', count: data?.open_returns },
        { to: '/admin/payouts', label: 'Payouts' },
        { to: '/admin/reviews', label: 'Reviews' },
        { to: '/admin/settings', label: 'Commission' },
        { to: '/admin/integrations', label: 'Integrations' },
      ]}
    />
  )
}

export default function App() {
  const { loading } = useAuth()
  if (loading) return null
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/seller/register" element={<SellerRegister />} />
      <Route path="/forgot" element={<Forgot />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/seller" element={<SellerArea />}>
        <Route index element={<SellerDashboard />} />
        <Route path="products" element={<SellerProducts />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="products/:id/view" element={<SellerProductView />} />
        <Route path="orders/:id" element={<SellerOrderDetail />} />
        <Route path="orders" element={<SellerOrders />} />
        <Route path="earnings" element={<SellerEarnings />} />
        <Route path="profile" element={<SellerProfile />} />
      </Route>
      <Route path="/admin" element={<AdminArea />}>
        <Route index element={<AdminDashboard />} />
        <Route path="sellers" element={<AdminSellers />} />
        <Route path="sellers/:id" element={<AdminSellerDetail />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/:id" element={<AdminProductDetail />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/:id" element={<AdminOrderDetail />} />
        <Route path="payouts" element={<AdminPayouts />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="integrations" element={<AdminIntegrations />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
