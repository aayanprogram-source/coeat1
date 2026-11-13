import { AuthPage } from '@datapal/ui-web';
import { SignupForm } from '@/features/auth/components/signup-form';

export default function SignupPage() {
  return (
    <AuthPage titleKey="rd.auth.create">
      <SignupForm />
    </AuthPage>
  );
}
