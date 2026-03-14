import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { RoleProvider } from '../context/RoleContext';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'City Surveillance - ITMS ERP Platform',
  description: 'Integrated Traffic Management System ERP Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <AuthProvider>
          <RoleProvider>
            <AppShell>
              {children}
            </AppShell>
          </RoleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
