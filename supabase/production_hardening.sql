-- Recomendado executar no SQL Editor antes da publicação.
-- Garante os privilégios mínimos para o Data API e evita depender de defaults.

grant insert on table public.respostas to anon, authenticated;
grant select on table public.respostas to authenticated;
revoke update, delete on table public.respostas from anon, authenticated;

grant select on table public.administradores to authenticated;

-- A função é usada pelas políticas RLS para identificar administradores.
grant execute on function public.eh_administrador() to authenticated;
