import { Suspense } from 'react';
import { AuthPage } from '@datapal/ui-web';
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <AuthPage titleKey="sa.auth.title">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthPage>
  );
}
