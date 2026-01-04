import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '../store/useAuthStore';

export default function DashboardLayout() {
  const { user } = useAuthStore();

  return (
    <div className="app">
      <Sidebar />
      <div className="main-content">
        <Header user={user} />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}