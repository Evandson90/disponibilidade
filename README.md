# Disponibilidade de Lançamentos — Front (Next.js) para Vercel

Front que lê o Supabase em tempo real. Duas telas:
- **/espelho** — tela das TVs (somente leitura, sanitizada, tempo real via Realtime).
- **/painel** — operador (login + alteração via a função `reservar_unidade`).

## Pré-requisito
Ter rodado antes no Supabase os scripts `supabase_1_schema.sql` e `supabase_2_dados.sql`.

## Publicar no Vercel (caminho recomendado: GitHub)
1. Crie um repositório no GitHub e suba esta pasta (veja "Subir no GitHub" abaixo).
2. Em https://vercel.com → **Add New… → Project** → importe o repositório.
3. O Vercel detecta **Next.js** sozinho. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = a URL do seu projeto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = a chave **anon public** (Supabase → Settings → API)
4. Clique **Deploy**. Em ~1 min sai a URL (ex.: `https://disponibilidade-ilhapura.vercel.app`).
5. A TV usa `.../espelho`; os operadores usam `.../painel`.

## Publicar no Vercel (alternativa: CLI, sem GitHub)
```
npm i -g vercel
cd web-nextjs
vercel            # segue o assistente e faz o deploy
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

## Subir no GitHub
```
cd web-nextjs
git init && git add . && git commit -m "front disponibilidade"
git branch -M main
git remote add origin https://github.com/SUA-CONTA/SEU-REPO.git
git push -u origin main
```

## Rodar local antes (opcional)
```
cp .env.local.example .env.local   # preencha URL e ANON KEY
npm install
npm run dev                        # http://localhost:3000
```

## Criar um usuário de teste (para o /painel)
1. Supabase → **Authentication → Users → Add user** (e-mail + senha).
2. Supabase → **SQL Editor**, vincule o perfil:
```sql
insert into usuario(id, nome, email, perfil)
select id, 'Operador Teste', email, 'Operador' from auth.users where email='SEU@EMAIL'
on conflict (id) do update set perfil='Operador';
```
Sem esse vínculo o operador entra, mas a função de reserva assume o perfil padrão.

## Segurança
- No front vai **só a chave anon**. A `service_role` **nunca** vai para o navegador nem para o Vercel público.
- A tela /espelho não expõe dados pessoais (a view `vw_espelho` já é sanitizada e o RLS bloqueia o resto).
