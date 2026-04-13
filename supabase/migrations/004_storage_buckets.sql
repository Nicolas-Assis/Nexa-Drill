-- Criar buckets de storage para fotos

-- Bucket para logos de perfuradores
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('perfis', 'perfis', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Bucket para fotos de serviços
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('servicos', 'servicos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso para o bucket 'perfis'
CREATE POLICY "Permitir upload de logo autenticado" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'perfis');

CREATE POLICY "Permitir leitura pública de logos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'perfis');

CREATE POLICY "Permitir atualização de logo autenticado" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'perfis');

CREATE POLICY "Permitir exclusão de logo autenticado" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'perfis');

-- Políticas de acesso para o bucket 'servicos'
CREATE POLICY "Permitir upload de fotos de serviço autenticado" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'servicos');

CREATE POLICY "Permitir leitura pública de fotos de serviço" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'servicos');

CREATE POLICY "Permitir atualização de fotos de serviço autenticado" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'servicos');

CREATE POLICY "Permitir exclusão de fotos de serviço autenticado" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'servicos');
