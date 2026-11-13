import { Checkbox, useRows } from '@datapal/ui-web';

export function CityChoices({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const cities = useRows<{ id: string; name: string }[]>(['rows', 'cities', 'choices'], (a) => a.from('cities').select('id, name').order('name'));
  return (
    <div className="flex flex-col">
      {(cities.data ?? []).map((c) => (
        <Checkbox
          key={c.id}
          label={c.name}
          checked={value.includes(c.id)}
          onCheckedChange={(on) => onChange(on ? [...value, c.id] : value.filter((id) => id !== c.id))}
        />
      ))}
    </div>
  );
}
