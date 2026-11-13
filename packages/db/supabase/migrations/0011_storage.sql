-- Storage buckets and policies. The storage schema exists only on Supabase.
do $$
begin
  if to_regclass('storage.buckets') is null then
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
    ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
    ('story-photos', 'story-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
    ('restaurant-media', 'restaurant-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
    ('bill-photos', 'bill-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;

  -- Customers write only inside their own folder; the folder name is their user id.
  create policy avatars_write on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  create policy avatars_update on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  create policy story_photos_write on storage.objects for insert to authenticated
    with check (bucket_id = 'story-photos' and (storage.foldername(name))[1] = auth.uid()::text);

  -- Restaurant media and bill photos live in a folder named after the restaurant id.
  create policy restaurant_media_write on storage.objects for insert to authenticated
    with check (bucket_id = 'restaurant-media'
      and app.is_restaurant_member(((storage.foldername(name))[1])::uuid, array['owner', 'manager']));
  create policy restaurant_media_update on storage.objects for update to authenticated
    using (bucket_id = 'restaurant-media'
      and app.is_restaurant_member(((storage.foldername(name))[1])::uuid, array['owner', 'manager']));
  create policy bill_photos_write on storage.objects for insert to authenticated
    with check (bucket_id = 'bill-photos'
      and app.is_restaurant_member(((storage.foldername(name))[1])::uuid, array['owner', 'manager', 'cashier']));
  create policy bill_photos_read on storage.objects for select to authenticated
    using (bucket_id = 'bill-photos'
      and (app.is_restaurant_member(((storage.foldername(name))[1])::uuid, array['owner', 'manager'])
           or app.has_permission('redemptions.view')));
end $$;
