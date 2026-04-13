-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  005 - Storage bucket para fotos de perfil                                ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Criar bucket para armazenar fotos de perfil
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'perfis',
  'perfis',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Criar bucket para fotos de serviços (portfólio)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'servicos',
  'servicos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  RLS Policies para storage                                                 ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Política para upload de fotos de perfil (apenas usuário autenticado pode fazer upload do próprio perfil)
CREATE POLICY "Allow authenticated users to upload profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'perfis');

-- Política para atualizar/substituir imagens de perfil
CREATE POLICY "Allow authenticated users to update profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'perfis');

-- Política para deletar imagens de perfil
CREATE POLICY "Allow authenticated users to delete profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'perfis');

-- Política pública para visualizar imagens de perfil
CREATE POLICY "Allow public to view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'perfis');

-- Política para upload de fotos de serviços
CREATE POLICY "Allow authenticated users to upload service images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'servicos');

-- Política para atualizar imagens de serviços
CREATE POLICY "Allow authenticated users to update service images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'servicos');

-- Política para deletar imagens de serviços
CREATE POLICY "Allow authenticated users to delete service images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'servicos');

-- Política pública para visualizar imagens de serviços
CREATE POLICY "Allow public to view service images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'servicos');
