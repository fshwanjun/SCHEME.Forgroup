-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Create a storage bucket for images
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- 2. Set up security policies for the 'images' bucket

-- Policy to allow public read access to all files in the bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'images' );

-- Policy to allow authenticated users (admins) to upload files
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check (
    bucket_id = 'images'
    and auth.role() = 'authenticated'
  );

-- Policy to allow authenticated users (admins) to update their files
create policy "Authenticated users can update images"
  on storage.objects for update
  using (
    bucket_id = 'images'
    and auth.role() = 'authenticated'
  );

-- Policy to allow authenticated users (admins) to delete their files
create policy "Authenticated users can delete images"
  on storage.objects for delete
  using (
    bucket_id = 'images'
    and auth.role() = 'authenticated'
  );

