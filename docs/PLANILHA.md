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
| K | 10 | `observacoes` | `[02/11/2026 10:30] Ajuste de horário` | Recebe o motivo das edições feitas pelo sistema |

### Regras

- Um funcionário tem **no máximo um registro por dia** (validado por `getLatestEmployeeRecord`).
- A linha é criada na primeira ação (`entrada`) e atualizada nas seguintes.
- `totalHoras` é preenchido quando existe entrada **e** saída.
- Ao editar as colunas E–H manualmente na planilha, o trigger `onEdit` (opcional) recalcula a coluna I.
- As edições feitas pelo sistema (tela **Registros**) também recalculam a coluna I automaticamente.

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

## Configuração manual

### 1. Criar as abas

No Google Sheets, crie as abas com os nomes exatos. A aba `config_escala` pode ser criada automaticamente ao salvar a primeira escala em **Ajustes**, mas criar manualmente evita surpresas.

### 2. Configurar o trigger `onEdit` (opcional)

Só é necessário se alguém for editar horários **diretamente na planilha**. Como o fluxo recomendado é editar pela tela **Registros**, o gatilho pode ficar desativado.

1. Abra o projeto no [Google Apps Script](https://script.google.com/).
2. Menu **Editar → Gatilhos do projeto atual**.
3. Clique em **+ Adicionar gatilho**.
4. Função: **`onEdit`**.
5. Origem do evento: **Da planilha**.
6. Tipo de evento: **Ao editar**.
7. Salvar e autorizar as permissões.

> Sem o trigger, o recálculo continua acontecendo no registro normal (`registerClockAction`) e em toda edição feita pela tela `Registros` (`atualizarRegistro`).

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

> Ao selecionar o funcionário, a tela carrega a escala já salva. Se não houver configuração, os campos mostram o padrão (`3,7`, 8h, 0h) e um aviso indica que nada foi salvo ainda.
>
> A coluna `folgas` pode ser texto (`3,7`) ou número (`3.7`): `parseFolgas` entende os dois formatos. Ainda assim, o ideal é manter a coluna como **texto** para evitar interpretações do Sheets.

### 5. Corrigir registros

Não é necessário editar a planilha. Na página **Registros** (`?page=registros`):

1. Filtre o período desejado.
2. Clique no ícone de lápis ao lado do registro.
3. Corrija entrada, saída do intervalo, retorno e/ou saída.
4. Se quiser, informe o motivo da alteração.
5. Clique em **Salvar**.

O sistema valida a ordem dos horários, recalcula o total e grava o motivo na coluna `observacoes` com data/hora.

> O botão de edição aparece apenas quando a sessão é de administrador. Ainda assim, a função de backend não valida o perfil — a restrição visual não substitui segurança no servidor.

---

## Formatos de data e hora

- O backend espera e devolve datas no formato **`dd/MM/yyyy`**.
- Horários são gravados como **texto `HH:mm:ss`** (`Utilities.formatDate`).
- `formatTimeForDisplay` e `formatDurationForDisplay` aceitam tanto `Date` (célula formatada como hora) quanto texto.
- A conversão de datas é centralizada em **`parseDateBR`**, que entende `dd/MM/yyyy`, `dd-MM-yyyy`, `dd.MM.yyyy` e ISO `yyyy-MM-dd` sem a ambiguidade do `new Date(string)` do V8.
- `formatDateBR` usa o mesmo parser e devolve sempre `dd/MM/yyyy`.

> Recomendação: mantenha a coluna `data` como **data real** formatada `dd/MM/aaaa` e a planilha com localidade **Brasil** e fuso **São Paulo**.

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
