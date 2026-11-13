import { AuthPage } from '@datapal/ui-web';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <AuthPage titleKey="rd.auth.title">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthPage>
  );
}
