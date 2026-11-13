import { AuthPage } from '@datapal/ui-web';
import { MfaForm } from '@/features/auth/components/mfa-form';

export default function MfaPage() {
  return (
    <AuthPage titleKey="sa.auth.mfa_enrol_title">
      <MfaForm />
    </AuthPage>
  );
}
