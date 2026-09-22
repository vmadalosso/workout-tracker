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

Paleta [Dracula](https://draculatheme.com/contribute#color-palette). O fundo é uma
malha de três radiais neon (pink e purple no topo, cyan embaixo), fixa para não
deslizar com a rolagem.

Uma exceção na paleta: `--color-muted` é o Comment (`#6272a4`) clareado, porque o
original rende 2.5:1 sobre o card — abaixo do mínimo para texto. Precisou de um
segundo clareamento quando o gradiente entrou: medindo os pixels renderizados, o
texto do cabeçalho sobre a área mais forte da malha caía para 4.47:1. Hoje o pior
ponto dá 4.60:1 (6.7:1 sobre o fundo puro). **Se mexer nas opacidades do
gradiente, meça de novo** — o fundo mais claro derruba o contraste do texto.

Ícones: [`lucide-react`](https://lucide.dev). Escolhido no lugar do Phosphor por
ser mais leve; se quiser os pesos do Phosphor (thin/duotone), a troca é mecânica.

Decisões pensadas para uso no celular dentro da academia:

- O alvo de toque de um exercício é a linha inteira, não o quadrado de 28px.
- Inputs têm `font-size: 16px` — abaixo disso o Safari do iOS dá zoom na página
  a cada foco.
- `env(safe-area-inset-*)` em cima e embaixo, porque o manifest declara
  `display: standalone` e na tela de início não há barra do navegador protegendo.
- Os cards são um acordeão: um aberto por vez, abrindo sozinho no primeiro
  treino ainda não concluído. Na ordem Upper A → Lower A → Upper B → Lower B
  isso cai no treino da vez sem precisar adivinhar o dia da semana, e o cabeçalho
  fechado ainda mostra `3/9` para não esconder o andamento.
- Coluna única em qualquer largura: com um card aberto por vez, duas colunas só
  deixavam um vazio ao lado do card aberto.

## Gráfico de peso

`recharts`. A linha é o Pink do Dracula (`#ff79c6`) e a faixa de meta é o Green
(`#50fa7b`), escolhidos por validação de contraste sob daltonismo, não por gosto:

| Linha testada | ΔE vs. banda verde | Veredito |
|---|---|---|
| Pink `#ff79c6` | deutan 17.4 · tritan 35.0 | escolhida |
| Purple `#bd93f9` | deutan 26.7 · tritan 22.4 | ok, mas é o acento da UI |
| Orange `#ffb86c` | deutan **3.3** | indistinguível da banda |
| Yellow `#f1fa8c` | protan **3.1** | indistinguível da banda |
| Cyan `#8be9fd` | croma 0.093 | abaixo do piso, lê como cinza |

Laranja e amarelo pareciam perfeitamente distintos a olho nu. Não eram.

Outras decisões do gráfico: grade sólida (tracejado fica reservado para os
limites da meta, onde significa "limiar"); sem legenda, porque com série única o
título já nomeia; com menos de dois pontos não há gráfico, só os números; e existe
uma tabela equivalente atrás de "ver números", para o valor nunca depender de hover.

Cores no gráfico são hex literais, não `var(--…)`: atributos de apresentação em
SVG não resolvem custom properties do CSS.

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
