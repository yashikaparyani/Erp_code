import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { RoleProvider } from '../context/RoleContext';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'Technosys ERP',
  description: 'tailored for your needs and as per experiences',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 windows-erp-theme">
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
