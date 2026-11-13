import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CodeCard } from './code-card';
import { FormField } from './form-field';
import { Input } from './input';
import { ProgressBar } from './progress-bar';

afterEach(cleanup);

describe('FormField', () => {
  it('links the label, error and input for assistive technology', () => {
    render(
      <FormField label="Email" error="Enter a valid email">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Enter a valid email');
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
  });
});

describe('ProgressBar', () => {
  it('clamps to the range and exposes its value', () => {
    render(<ProgressBar value={30} max={20} label="Codes left" />);
    const bar = screen.getByRole('progressbar', { name: 'Codes left' });
    expect(bar.getAttribute('aria-valuenow')).toBe('30');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('100%');
  });
});

describe('CodeCard', () => {
  it('shows the code, offer, minimum bill in rupees and the first-time-only line', () => {
    render(
      <CodeCard
        restaurantName="Test Kitchen"
        logoUrl={null}
        offerLine="20% off up to ₹200"
        minBillPaise={30000}
        code="0427"
        qrValue="code-id"
        remaining={12}
        total={20}
        msRemaining={3_725_000}
        labels={{ minBill: 'Min bill {amount}', codesLeft: '{count} codes left', firstTimeOnly: 'Valid for first-time guests only', qr: 'QR' }}
      />,
    );
    expect(screen.getByText('0427')).toBeTruthy();
    expect(screen.getByText('Min bill ₹300')).toBeTruthy();
    expect(screen.getAllByText('12 codes left').length).toBeGreaterThan(0);
    expect(screen.getByText('1:02:05')).toBeTruthy();
    expect(screen.getByText('Valid for first-time guests only')).toBeTruthy();
  });
});
