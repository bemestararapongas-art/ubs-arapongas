# UBS Arapongas — Experiência dos Usuários

Aplicação web para pesquisa anônima de experiência dos usuários da UBS Arapongas, em Araranguá/SC.

## Stack
- Next.js + React + TypeScript
- Supabase Auth + PostgreSQL + Row Level Security

## Variáveis de ambiente
Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

A chave publishable pode ser usada no navegador; a proteção depende das políticas RLS do banco. Nunca coloque `sb_secret_...` no frontend.

## Banco
O banco já foi criado no projeto Supabase e o administrador inicial foi associado à tabela `public.administradores`.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Produção

```bash
npm run build
npm start
```

Para publicar, use uma plataforma compatível com Next.js, como Vercel, e configure as duas variáveis de ambiente no projeto de hospedagem.

## Fluxo
- Público: responde a pesquisa em `/`.
- Administrativo: login pelo botão "Acesso administrativo".
- Administrador: dashboard, filtros, lançamento manual e exportação CSV.

## Observação de segurança
A aplicação não solicita nome, CPF, telefone ou outros identificadores pessoais. A tabela `respostas` possui RLS: inserção é permitida para o fluxo da pesquisa e leitura é limitada a administradores registrados em `public.administradores`.
