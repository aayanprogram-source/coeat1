import { AuthPage } from '@datapal/ui-web';
import { SignupForm } from '@/features/auth/components/signup-form';

export default function SignupPage() {
  return (
    <AuthPage titleKey="sa.auth.signup_title" footerKey="sa.auth.signup_help">
      <SignupForm />
    </AuthPage>
  );
}
