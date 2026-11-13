import { AuthPage } from '@datapal/ui-web';
import { ResetForm } from '@/features/auth/components/reset-form';

export default function ResetPage() {
  return (
    <AuthPage titleKey="rd.auth.reset_title">
      <ResetForm />
    </AuthPage>
  );
}
