# 🗄️ Estrutura da Planilha

O sistema usa **uma planilha Google** como banco de dados. Todas as funções do backend acessam `SpreadsheetApp.getActiveSpreadsheet()`, portanto **o script precisa estar vinculado a ela**.

- A **linha 1** de cada aba é o cabeçalho.
- Os **dados começam na linha 2**.
- A ordem das colunas importa: o código acessa por índice (`row[0]`, `row[1]`, ...).

---

## Abas utilizadas

| Aba | Função | Obrigatória |
|---|---|---|
| `registro_ponto` | Registros de ponto | Sim |
| `usuario` | Funcionários (login) | Sim |
| `admin` | Administradores (login) | Sim |
| `config_escala` | Escala 5x2 por funcionário | Criada automaticamente, mas recomendada |

---

## `registro_ponto`

Registro principal. Cada linha representa **um dia de trabalho** de um funcionário; os quatro horários são preenchidos na mesma linha ao longo do dia.

| Coluna | Índice | Cabeçalho | Exemplo | Observações |
|---|---|---|---|---|
| A | 0 | `idRegistro` | `1` | Gerado automaticamente (`max + 1`) |
| B | 1 | `idFuncionario` | `1` | Corresponde ao `id` da aba `usuario` |
| C | 2 | `nome` | `João Silva` | Nome exibido nos relatórios |
| D | 3 | `data` | `02/11/2026` | `dd/MM/yyyy` — pode ser texto ou `Date` |
| E | 4 | `entrada` | `08:00:00` | `HH:mm:ss` |
| F | 5 | `saidaIntervalo` | `12:00:00` | `HH:mm:ss` |
| G | 6 | `retornoIntervalo` | `13:00:00` | `HH:mm:ss` |
| H | 7 | `saida` | `17:00:00` | `HH:mm:ss` |
| I | 8 | `totalHoras` | `08:00` | `HH:mm`; recalculado pelo backend |
| J | 9 | `geolocalizacao` | `-23.550520, -46.633308` | Texto livre enviado pelo cliente |
| K | 10 | `observacoes` | `` | Reservado; ainda não usado pela interface |

### Regras

- Um funcionário tem **no máximo um registro por dia** (validado por `getLatestEmployeeRecord`).
- A linha é criada na primeira ação (`entrada`) e atualizada nas seguintes.
- `totalHoras` é preenchido quando existe entrada **e** saída.
- Ao editar as colunas E–H manualmente na planilha, o trigger `onEdit` recalcula a coluna I.

### Exemplo

| idRegistro | idFuncionario | nome | data | entrada | saidaIntervalo | retornoIntervalo | saida | totalHoras | geolocalizacao | observacoes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | João Silva | 02/11/2026 | 08:00:00 | 12:00:00 | 13:00:00 | 17:00:00 | 08:00 | -23.55, -46.63 | |

---

## `usuario`

Funcionários que fazem login na página de ponto.

| Coluna | Índice | Cabeçalho | Exemplo | Observações |
|---|---|---|---|---|
| A | 0 | `id` | `1` | Usado em `registro_ponto.idFuncionario` |
| B | 1 | `username` | `joao` | Login |
| C | 2 | `password` | `1234` | **Texto plano** |
| D | 3 | `nome` | `João Silva` | Nome exibido |
| E | 4 | `email` | `joao@empresa.com` | Opcional |

> `processLogin` compara `username` e `password` com `trim()`. Espaços nas pontas são ignorados.

---

## `admin`

Administradores. A validação é feita **antes** da aba `usuario`, então um admin pode ter o mesmo username de um funcionário (não recomendado).

| Coluna | Índice | Cabeçalho | Exemplo |
|---|---|---|---|
| A | 0 | `id` | `1` |
| B | 1 | `username` | `admin` |
| C | 2 | `password` | `admin123` |
| D | 3 | `nome` | `Administrador` |

---

## `config_escala`

Configuração de escala por funcionário. Se a aba não existir, `salvarEscalaFuncionario` a cria automaticamente com o cabeçalho.

| Coluna | Índice | Cabeçalho | Exemplo | Observações |
|---|---|---|---|---|
| A | 0 | `idFuncionario` | `1` | Chave; um registro por funcionário |
| B | 1 | `tipoEscala` | `5x2_40h` | Ver tipos abaixo |
| C | 2 | `folgas` | `3,7` | Dias separados por vírgula |
| D | 3 | `cargaDiaria` | `8` | Horas por dia |
| E | 4 | `cargaSabado` | `0` | Horas no sábado (0 = não trabalha) |

### Tipos de escala aceitos

| Valor | Descrição | Carga diária |
|---|---|---|
| `5x2_40h` | 5x2, 40h semanais | 8h |
| `5x2_44h` | 5x2, 44h semanais | 8h48m (`8.8`) |
| `5x2_sabado_parcial` | 5x2 com sábado de 4h | 8h |
| `personalizado` | Livre | Conforme cadastro |

### Mapa dos dias de folga

| Valor | Dia |
|---|---|
| `1` | Segunda-feira |
| `2` | Terça-feira |
| `3` | Quarta-feira |
| `4` | Quinta-feira |
| `5` | Sexta-feira |
| `6` | Sábado |
| `7` | Domingo |

- **Padrão do sistema** quando não há configuração: `[3, 7]` (quarta e domingo), carga `8h`.
- Exemplo para folga quarta + domingo: `3,7`.
- A coluna aceita texto (`"3,7"`) ou número; o código faz `String(valor).split(',')`.

### Exemplo

| idFuncionario | tipoEscala | folgas | cargaDiaria | cargaSabado |
|---|---|---|---|---|
| 1 | 5x2_40h | 3,7 | 8 | 0 |
| 2 | 5x2_44h | 6,7 | 8.8 | 0 |
| 3 | 5x2_sabado_parcial | 7 | 8 | 4 |

---

## Configuração manual obrigatória

### 1. Criar as abas

No Google Sheets, crie as abas com os nomes exatos. A aba `config_escala` pode ser criada automaticamente ao salvar a primeira escala em **Ajustes**, mas criar manualmente evita surpresas.

### 2. Configurar o trigger `onEdit`

Necessário para recalcular `totalHoras` quando o administrador editar horários diretamente na planilha.

1. Abra o projeto no [Google Apps Script](https://script.google.com/).
2. Menu **Editar → Gatilhos do projeto atual**.
3. Clique em **+ Adicionar gatilho**.
4. Função: **`onEdit`**.
5. Origem do evento: **Da planilha**.
6. Tipo de evento: **Ao editar**.
7. Salvar e autorizar as permissões.

> Sem o trigger, o recálculo só acontece via `registerClockAction` (registro normal pelo app) ou chamando `recalcularTotalHoras(row)` manualmente.

### 3. Cadastrar acessos

- **Admin**: uma linha na aba `admin`.
- **Funcionários**: uma linha por pessoa na aba `usuario`, com `id` único.

### 4. Cadastrar escalas

Na página **Ajustes** (`?page=ajustes`):

1. Selecione o funcionário.
2. Escolha o tipo de escala.
3. Informe as folgas (ex.: `3,7`).
4. Informe a carga diária e a de sábado.
5. Clique em **Salvar Escala do Funcionário**.

> A tela atualmente não recarrega a escala já salva ao selecionar o funcionário; os campos voltam ao padrão. A edição pode ser feita diretamente na aba `config_escala`.

---

## Formatos de data e hora

- O backend espera e devolve datas no formato **`dd/MM/yyyy`**.
- Horários são gravados como **texto `HH:mm:ss`** (`Utilities.formatDate`).
- `formatTimeForDisplay` e `formatDurationForDisplay` aceitam tanto `Date` (célula formatada como hora) quanto texto.
- ⚠️ Evite `new Date("02/11/2026")`: no runtime V8 isso é lido como **11 de fevereiro** (`mm/dd/yyyy`), não 2 de novembro. Para converter, faça o split manual:

```js
const [dia, mes, ano] = dataStr.split('/').map(Number);
const data = new Date(ano, mes - 1, dia);
```

---

## Propriedades do script

As configurações da página **Ajustes** não ficam na planilha: são salvas em `PropertiesService` com a chave `configSistema`.

```json
{
  "cargaHorariaDia": 8,
  "permitirSabado": false,
  "notificacoes": true
}
```

Para inspecionar: **Apps Script → Configurações do projeto → Propriedades do script**.

---

## Backup e integridade

- Use **Arquivo → Fazer uma cópia** no Sheets para backups pontuais.
- Para histórico automático, considere versionamento da planilha ou exportação periódica.
- `registerClockAction` usa `LockService` (espera de 10s) para evitar registros duplicados em acessos simultâneos.
- As funções de escala **não** usam lock; edições simultâneas em `config_escala` podem se sobrepor.
