'use client';

import { restaurantDetailsSchema, type AppConfig, type RestaurantDetails } from '@datapal/core';
import { Button, Checkbox, FormField, Input, Select, useRpcMutation, useT } from '@datapal/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { LocateFixed } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { MapPin } from './map-pin';

export type DetailsValues = Omit<RestaurantDetails, 'hours'>;
const noHours = {} as RestaurantDetails['hours'];

export interface DetailsStepProps {
  config: AppConfig;
  restaurantId: string | null;
  initial: DetailsValues;
  onSaved: (restaurantId: string) => void;
}

export function DetailsStep({ config, restaurantId, initial, onSaved }: DetailsStepProps) {
  const t = useT();
  const create = useRpcMutation('create_restaurant');
  const update = useRpcMutation('update_restaurant');
  const form = useForm<DetailsValues>({
    resolver: zodResolver(restaurantDetailsSchema.omit({ hours: true })) as never,
    defaultValues: initial,
  });
  const errors = form.formState.errors;
  const lat = form.watch('lat');
  const lng = form.watch('lng');
  const mapsKey = config.maps_public_keys.web;

  const submit = form.handleSubmit(async (values) => {
    if (restaurantId) {
      await update.mutateAsync({ p_restaurant_id: restaurantId, p_details: values });
      onSaved(restaurantId);
    } else {
      const id = await create.mutateAsync({ p_details: { ...values, hours: noHours } });
      if (typeof id === 'string') onSaved(id);
    }
  });

  const locate = () =>
    navigator.geolocation.getCurrentPosition((p) => {
      form.setValue('lat', p.coords.latitude, { shouldValidate: true });
      form.setValue('lng', p.coords.longitude, { shouldValidate: true });
    });

  const bad = (name: keyof DetailsValues) => (errors[name] ? t('common.invalid_value') : undefined);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <FormField label={t('common.name')} error={bad('name')}>
        <Input {...form.register('name')} />
      </FormField>
      <FormField label={t('rd.onboarding.city')} error={bad('city_id')}>
        <Select {...form.register('city_id')}>
          <option value="">{t('common.none')}</option>
          {config.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t('rd.onboarding.cuisines')} error={bad('cuisine_ids')}>
        <Controller
          control={form.control}
          name="cuisine_ids"
          render={({ field }) => (
            <div className="grid sm:grid-cols-2">
              {config.cuisines.map((c) => (
                <Checkbox key={c.id} label={c.name} checked={field.value.includes(c.id)} onCheckedChange={(on) => field.onChange(on ? [...field.value, c.id].slice(0, 5) : field.value.filter((id) => id !== c.id))} />
              ))}
            </div>
          )}
        />
      </FormField>
      <FormField label={t('rd.onboarding.address')} error={bad('address')}>
        <Input autoComplete="street-address" {...form.register('address')} />
      </FormField>
      <FormField label={t('common.phone')} hint={t('rd.onboarding.phone_hint')} error={bad('phone')}>
        <Input type="tel" autoComplete="tel" {...form.register('phone')} />
      </FormField>
      <div className="flex flex-col gap-2">
        <p className="text-caption font-medium text-ink">{t('rd.onboarding.pin_help')}</p>
        {mapsKey ? <MapPin apiKey={mapsKey} lat={lat} lng={lng} label={t('rd.onboarding.pin_help')} onChange={(la, ln) => { form.setValue('lat', la, { shouldValidate: true }); form.setValue('lng', ln, { shouldValidate: true }); }} /> : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <FormField label={t('sa.master.lat')} error={bad('lat')}>
            <Input type="number" step="any" {...form.register('lat', { valueAsNumber: true })} />
          </FormField>
          <FormField label={t('sa.master.lng')} error={bad('lng')}>
            <Input type="number" step="any" {...form.register('lng', { valueAsNumber: true })} />
          </FormField>
          <Button variant="secondary" className="self-end" icon={<LocateFixed className="h-4 w-4" aria-hidden />} onClick={locate}>
            {t('rd.onboarding.use_location')}
          </Button>
        </div>
      </div>
      <FormField label={t('rd.settings.upi')} optionalLabel={`(${t('common.optional')})`} error={bad('upi_id')}>
        <Input {...form.register('upi_id')} />
      </FormField>
      <Button type="submit" loading={form.formState.isSubmitting}>
        {t('common.continue')}
      </Button>
    </form>
  );
}
