# workout-tracker

Acompanhamento semanal de treino. Next.js + Supabase, hospedado na Vercel.

O banco vive no projeto Supabase **`dev-portfolio-db`**, isolado no schema
**`workout_tracker`** — o mesmo projeto Supabase pode hospedar outros
experimentos em schemas separados.

## Como funciona

- Quatro cards de treino (Upper A, Lower A, Upper B, Lower B), cada um com seus exercícios.
- A barra de progresso conta **treinos completos**: um treino só conta quando
  todos os exercícios dele estão marcados.
- O campo de registro é uma propriedade do exercício, não da semana. A sugestão
  vem da coluna `hint`: musculação anota `carga x reps`, cardio anota tempo.
  **Resetar a semana não apaga carga.**
- `Resetar semana` arquiva o estado atual em `week_history` (com snapshot em JSONB),
  zera os checks e incrementa o contador da semana.

## Interface

Paleta [Dracula](https://draculatheme.com/contribute#color-palette). Uma exceção:
`--color-muted` é o Comment (`#6272a4`) clareado, porque o original rende 2.5:1
sobre o card — abaixo do mínimo para texto. O Comment original ficou em
`--color-faint`.

Decisões pensadas para uso no celular dentro da academia:

- O alvo de toque de um exercício é a linha inteira, não o quadrado de 28px.
- Inputs têm `font-size: 16px` — abaixo disso o Safari do iOS dá zoom na página
  a cada foco.
- `env(safe-area-inset-*)` em cima e embaixo, porque o manifest declara
  `display: standalone` e na tela de início não há barra do navegador protegendo.
- Duas colunas só a partir de 768px: em 640px elas espremiam o nome do
  exercício a ~96px, pior do que uma coluna.

## Rodando local

```bash
cp .env.example .env.local   # preencha com as chaves do painel
npm install
npm run dev
```

## Banco

Migrations ficam em `supabase/migrations/` e sobem com a CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

### Armadilha: o schema precisa ser exposto

Por padrão o PostgREST só serve `public`. Sem este passo **toda** consulta volta
`PGRST106 Invalid schema`:

> Project Settings → API → **Exposed schemas** → adicionar `workout_tracker`

E como este projeto foi criado com *"Automatically expose new tables"* desligado,
toda tabela nova precisa de `grant` explícito — as migrations já fazem isso.

## Mudando os treinos

Os treinos e exercícios estão no banco, não no código. Dá para editar por SQL
enquanto não existe tela de edição:

```sql
-- renomear um exercício
update workout_tracker.exercises
   set name = 'Supino reto c/ barra'
 where name = 'Supino inclinado c/ halteres';

-- adicionar um exercício ao fim de um treino
insert into workout_tracker.exercises (user_id, workout_id, name, position)
select w.user_id, w.id, 'Crucifixo inclinado',
       coalesce(max(e.position), -1) + 1
  from workout_tracker.workouts w
  left join workout_tracker.exercises e on e.workout_id = w.id
 where w.slug = 'upper_a'
 group by w.user_id, w.id;

-- tirar um exercício sem perder o histórico
update workout_tracker.exercises
   set archived_at = now()
 where name = 'Cardio';
```

Como o app lê tudo do banco, uma tela de CRUD é um acréscimo — não um refactor.

## Auth

Magic link por e-mail (Supabase Auth). O app é de uso pessoal: depois do primeiro
login, desligue o cadastro em **Authentication → Sign In / Providers → Email →
Allow new users to sign up**. Essa é a trava de verdade — ela é do servidor, não
do cliente.

RLS está ligada nas quatro tabelas com `user_id = auth.uid()`.
