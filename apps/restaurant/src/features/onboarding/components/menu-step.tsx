'use client';

import { rupeesToPaise, formatPaise } from '@datapal/core';
import { Button, Card, Checkbox, FormField, Input, Select, useRows, useRpcMutation, useT } from '@datapal/ui-web';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import { parseMenuCsv, type MenuCsvResult } from '../menu-csv';

interface Category {
  id: string;
  name: string;
}
interface Item {
  id: string;
  category_id: string;
  name: string;
  price_paise: number;
  is_veg: boolean;
}

export function MenuStep({ restaurantId, onSaved }: { restaurantId: string; onSaved: () => void }) {
  const t = useT();
  const categories = useRows<Category[]>(['rows', 'menu_categories', restaurantId], (api) => api.from('menu_categories').select('id, name').eq('restaurant_id', restaurantId).order('sort_order'));
  const items = useRows<Item[]>(['rows', 'menu_items', restaurantId], (api) => api.from('menu_items').select('id, category_id, name, price_paise, is_veg').eq('restaurant_id', restaurantId).order('name'));
  const invalidate = [['rows', 'menu_categories'], ['rows', 'menu_items']];
  const addCategory = useRpcMutation('save_menu_category', { invalidate });
  const addItem = useRpcMutation('save_menu_item', { invalidate });
  const importMenu = useRpcMutation('import_menu', { invalidate, success: t('rd.onboarding.menu_imported') });
  const [category, setCategory] = useState('');
  const [item, setItem] = useState({ category_id: '', name: '', price: '', veg: false });
  const [csv, setCsv] = useState<MenuCsvResult | null>(null);

  const cats = categories.data ?? [];
  const chosen = item.category_id !== '' ? item.category_id : (cats[0]?.id ?? '');
  const itemReady = chosen !== '' && item.name.trim() !== '' && Number(item.price) >= 0 && item.price !== '';

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3">
        <h3 className="font-heading text-h2 font-semibold text-ink">{t('rd.onboarding.menu_csv')}</h3>
        <p className="text-caption text-muted">{t('rd.onboarding.menu_csv_help')}</p>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-body text-green-700 underline">
          <Upload className="h-4 w-4" aria-hidden />
          {t('rd.onboarding.menu_csv_choose')}
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(parseMenuCsv(await f.text())); }} />
        </label>
        {csv ? (
          <div className="flex flex-col gap-2">
            <p className="text-body text-ink tabular-nums">{t('rd.onboarding.menu_csv_summary', { good: csv.rows.length, bad: csv.errors.length })}</p>
            {csv.errors.length > 0 ? <p role="alert" className="text-caption text-danger">{t('rd.onboarding.menu_csv_lines', { lines: csv.errors.map((e) => e.line).join(', ') })}</p> : null}
            <Button disabled={csv.rows.length === 0} loading={importMenu.isPending} onClick={() => importMenu.mutate({ p_restaurant_id: restaurantId, p_rows: csv.rows }, { onSuccess: () => setCsv(null) })}>
              {t('rd.onboarding.menu_import')}
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <FormField label={t('rd.onboarding.category_name')}>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </FormField>
        <Button variant="secondary" disabled={!category.trim()} loading={addCategory.isPending} onClick={() => addCategory.mutate({ p_restaurant_id: restaurantId, p_id: undefined, p_name: category, p_sort_order: cats.length }, { onSuccess: () => setCategory('') })}>
          {t('rd.onboarding.add_category')}
        </Button>
      </Card>

      {cats.length > 0 ? (
        <Card className="flex flex-col gap-3">
          <FormField label={t('rd.onboarding.category_name')}>
            <Select value={chosen} onChange={(e) => setItem({ ...item, category_id: e.target.value })}>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('rd.onboarding.item_name')}>
            <Input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} />
          </FormField>
          <FormField label={t('rd.onboarding.item_price')}>
            <Input type="number" min={0} step="0.01" value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} />
          </FormField>
          <Checkbox label={t('rd.onboarding.item_veg')} checked={item.veg} onCheckedChange={(v) => setItem({ ...item, veg: v })} />
          <Button
            disabled={!itemReady}
            loading={addItem.isPending}
            onClick={() => addItem.mutate({ p_restaurant_id: restaurantId, p_id: undefined, p_data: { category_id: chosen, dish_category_id: null, name: item.name, price_paise: rupeesToPaise(Number(item.price)), is_veg: item.veg, is_available: true } }, { onSuccess: () => setItem({ category_id: chosen, name: '', price: '', veg: false }) })}
          >
            {t('rd.onboarding.add_item')}
          </Button>
        </Card>
      ) : null}

      <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
        {(items.data ?? []).map((i) => (
          <li key={i.id} className="flex justify-between gap-3 px-4 py-3 text-body tabular-nums">
            <span className="truncate text-ink">
              {i.name} <span className="text-caption text-muted">· {cats.find((c) => c.id === i.category_id)?.name}</span>
            </span>
            <span className="text-muted">{formatPaise(i.price_paise)}</span>
          </li>
        ))}
      </ul>
      <Button disabled={(items.data?.length ?? 0) === 0} onClick={onSaved}>
        {t('common.continue')}
      </Button>
    </div>
  );
}
