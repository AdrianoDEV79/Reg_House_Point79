# ⚙️ Referência do Backend (`utils.js`)

Todas as funções são **globais** e executam no servidor do Apps Script. O frontend as chama com `google.script.run`.

Contrato padrão para operações:

```js
{ success: true, message?: string, ...dados }
{ success: false, message: string }
```

Operações de leitura costumam retornar arrays ou objetos diretamente. Erros são registrados com `Logger.log` (visíveis em **Apps Script → Execuções**).

---

## Roteamento e templates

### `doGet(e)`

Ponto de entrada do Web App. Lê `e.parameter.page` e devolve a página correspondente via `HtmlService.createTemplateFromFile(...).evaluate()`, com título e meta viewport.

| `page` | Arquivo |
|---|---|
| `geral` | `admin.html` |
| `equipe` | `Equipe.html` |
| `registros` | `Registros.html` |
| `ajustes` | `Ajustes.html` |
| `regPonto` | `employee.html` |
| ausente / outro | `login.html` |

Em caso de erro, retorna um HTML simples com a mensagem.

### `include(filename)`

Retorna o conteúdo de um arquivo HTML como string. Útil para includes de CSS/JS parciais (não usado atualmente pelas páginas).

```js
<?!= include('estilos'); ?>
```

---

## Autenticação

### `processLogin(username, password)`

Valida as credenciais primeiro na aba `admin`, depois em `usuario`, comparando com `trim()`.

**Retornos:**

```js
// Admin
{ success: true, role: 'admin', name: 'Administrador' }

// Funcionário
{ success: true, role: 'usuario', userId: 1, userName: 'João Silva' }

// Falha
{ success: false, message: 'Usuário ou senha inválidos.' }
```

> Não há hash de senha nem geração de token. O frontend guarda a resposta em `sessionStorage` (`usuarioLogado`) e usa `userId`/`userName` nas chamadas seguintes.

---

## Utilitários de tempo

### `formatTimeForDisplay(sheetValue)`

Converte um valor de célula de horário em `HH:mm:ss`. Aceita `Date` ou texto; retorna `''` em erro.

### `formatDurationForDisplay(sheetValue)`

Converte um valor de duração em `HH:mm`. Usado para exibir `totalHoras`.

### `parseTime(timeStr)`

Converte `"HH:mm:ss"` em `{ hours, minutes, seconds }`; retorna `null` para entrada vazia ou inválida.

### `timeToMinutes(timeObj)`

Converte `{ hours, minutes, seconds }` em minutos decimais.

### `parseDateBR(value)`

Converte uma data em objeto `Date` sem a ambiguidade do parser nativo do V8.

- Aceita `Date`, `dd/MM/yyyy`, `dd-MM-yyyy`, `dd.MM.yyyy` e ISO `yyyy-MM-dd` (inclusive com hora).
- Valida datas impossíveis (ex.: `31/02/2026` retorna `null`).
- É a função usada por todas as leituras de data do sistema (`isDiaFolga`, `getLatestEmployeeRecord`, `getWorkingEmployees`, `getDashboardData`, `getRegistrosFiltrados` e `calcularBancoHoras`).

### `formatDateBR(value)`

Usa `parseDateBR` e devolve a data como `dd/MM/yyyy`, ou `''` se não for possível converter.

### `calculateTotalHours(entradaStr, saidaIntervaloStr, retornoIntervaloStr, saidaStr)`

Calcula a jornada líquida:

```text
(saída − entrada) − (retorno − saída do intervalo)
```

- Retorna `"HH:mm"` ou `''` se faltar entrada/saída, se o total for negativo ou se houver erro.
- O intervalo só é descontado quando **as duas** marcações existem e a diferença é positiva.

---

## Escala 5x2

### `parseFolgas(valor)`

Converte a coluna `folgas` em array de dias da semana.

- Aceita `"3,7"`, `"3.7"` (caso a célula tenha virado número), `"1, 3, 7"` e valores numéricos como `3.7`.
- Mantém apenas inteiros de `1` a `7` e remove duplicados.
- Se nada válido for encontrado, devolve o padrão `[3, 7]`.

### `getEscalaFuncionario(employeeId)`

Lê a aba `config_escala` e retorna a configuração do funcionário.

```js
// Encontrado
{ tipo: '5x2_40h', folgas: [3, 7], cargaDiaria: 8, cargaSabado: 0, salva: true }

// Não encontrado / erro / aba ausente
{ tipo: '5x2_40h', folgas: [3, 7], cargaDiaria: 8, cargaSabado: 0, salva: false }
```

- Faz leitura completa da aba a cada chamada (sem cache).
- `folgas` é convertido por `parseFolgas` (aceita vírgula ou ponto).
- `salva` indica se existe uma linha para o funcionário; a tela de Ajustes usa isso para avisar quando está mostrando o padrão.

### `isDiaFolga(employeeId, dataStr)`

Retorna `true` se o dia da semana de `dataStr` estiver na lista de folgas.

- `dataStr` deve ser `dd/MM/yyyy` (ou outro formato aceito por `parseDateBR`).
- `0` (domingo) é normalizado para `7`.
- A conversão é feita por `parseDateBR`, então `02/11/2026` é corretamente tratado como 2 de novembro (segunda-feira).

### `salvarEscalaFuncionario(employeeId, tipo, folgas, cargaDiaria, cargaSabado)`

Cria a aba `config_escala` se necessário, procura a linha do funcionário e faz `update` ou `append`.

| Parâmetro | Tipo | Exemplo |
|---|---|---|
| `employeeId` | string/number | `1` |
| `tipo` | string | `5x2_40h` |
| `folgas` | array de números | `[3, 7]` |
| `cargaDiaria` | number | `8` |
| `cargaSabado` | number | `0` |

**Retorno:** `{ success: true }` ou `{ success: false, message }`.

> Não usa `LockService`; grava `folgas.join(',')` na coluna C.

### `getTodasEscalas()`

Retorna todas as configurações da aba:

```js
[{ idFuncionario: 1, tipo: '5x2_40h', folgas: [3,7], cargaDiaria: 8, cargaSabado: 0 }]
```

Se a aba não existir, retorna `[]`.

---

## Recálculo de total de horas

### `recalcularTotalHoras(rowIndex)`

Recalcula uma linha específica de `registro_ponto` a partir das colunas E–H e grava o resultado em I (`totalHoras`).

- `rowIndex` é a linha **real da planilha** (1-based, contando o cabeçalho).
- Retorna `{ success: true, totalHoras: '08:00' }` ou `{ success: false, message }`.
- Se o cálculo resultar vazio, a célula não é alterada.

### `onEdit(e)`

Trigger instalável. Só age quando:

- a aba editada é `registro_ponto`;
- a linha é maior que 1 (não é cabeçalho);
- a coluna editada está entre 5 e 8 (entrada, saída intervalo, retorno, saída).

Chama `recalcularTotalHoras(e.range.getRow())`. Erros são apenas logados.

> É **opcional**: só é necessário se alguém editar horários diretamente na planilha. Edições pela tela `Registros` já recalculam pelo `atualizarRegistro`.

---

## Edição de registros pelo sistema

### `normalizarHora(valor)`

Normaliza um horário para `HH:mm:ss`.

- Aceita `HH:mm` ou `HH:mm:ss`.
- Retorna `''` para vazio e `null` para formato inválido (hora > 23, minuto/segundo > 59).

### `atualizarRegistro(idRegistro, entrada, saidaIntervalo, retornoIntervalo, saida, motivo)`

Atualiza os horários de um registro existente **sem editar a planilha manualmente**.

| Parâmetro | Tipo | Observação |
|---|---|---|
| `idRegistro` | string/number | Coluna A de `registro_ponto` |
| `entrada` | string | `HH:mm` ou `HH:mm:ss`; vazio permitido |
| `saidaIntervalo` | string | Vazio permitido |
| `retornoIntervalo` | string | Vazio permitido |
| `saida` | string | Vazio permitido |
| `motivo` | string | Opcional; gravado em `observacoes` |

**Validações:**

- Formato de todos os horários.
- Se houver qualquer horário, a entrada é obrigatória.
- Saída e retorno do intervalo devem ser informados juntos.
- Ordem cronológica: entrada < saída do intervalo < retorno < saída.
- Se houver saída, o total precisa ser válido.

**Efeitos:**

- Adquire `LockService` (10s).
- Grava E–H e recalcula I (`totalHoras`).
- Se houver motivo, anexa `[dd/MM/yyyy HH:mm] motivo` na coluna K, preservando o conteúdo anterior.

**Retorno:**

```js
{ success: true, message: 'Registro atualizado com sucesso.', totalHoras: '08:00', record: { ... } }
{ success: false, message: 'A saída deve ser depois da entrada.' }
```

> Não há verificação de perfil no servidor: a função confia que a chamada veio da tela admin. Ver [Segurança](../README.md#segurança-e-limitações).

---

## Banco de horas

### `calcularBancoHoras(employeeId, mes, ano)`

Percorre os registros do funcionário no mês/ano informados e calcula:

```text
totalHorasTrabalhadas = soma das colunas totalHoras (HH:mm → decimal)
diasTrabalhados       = quantidade de linhas com totalHoras
cargaPrevista         = diasTrabalhados × cargaDiaria
bancoHoras            = totalHorasTrabalhadas − cargaPrevista
```

**Retorno:**

```js
{
  bancoHoras: 1.5,
  totalHorasTrabalhadas: 161.5,
  cargaPrevista: 160,
  diasTrabalhados: 20
}
```

- `mes` é `1`–`12`, não `MM`.
- `cargaSabado` não é considerada.
- Faltas e feriados não reduzem a carga prevista (a base são apenas dias trabalhados).

### `getBancoHoras(employeeId)`

Atalho para o **mês atual**, usando `new Date()` (fuso do script). Retorna o mesmo objeto de `calcularBancoHoras`.

### `getBancoHorasTodos()`

Percorre a aba `usuario` e retorna o banco de horas do mês atual de cada funcionário:

```js
[{ id: 1, usuario: 'joao', nome: 'João Silva', bancoHoras: 1.5, totalHorasTrabalhadas: 161.5, cargaPrevista: 160 }]
```

> Esta função existe no backend, mas ainda não é usada por nenhuma tela.

---

## Registro de ponto

### `getLatestEmployeeRecord(employeeId)`

Procura, de baixo para cima em `registro_ponto`, o último registro **do dia atual** para o funcionário. Retorna `null` se não houver.

```js
{
  row: 12,
  idRegistro: 11,
  idFuncionario: 1,
  nomeFuncionario: 'João Silva',
  data: '02/11/2026',
  entrada: '08:00:00',
  saidaIntervalo: '12:00:00',
  retornoIntervalo: '13:00:00',
  saida: '17:00:00',
  totalHorasTrabalhadas: '08:00',
  geolocalizacao: '-23.55, -46.63',
  observacoes: ''
}
```

### `registerClockAction(employeeId, employeeName, actionType, geoLocation)`

Registra uma marcação. Ações aceitas:

| `actionType` | Coluna |
|---|---|
| `entrada` | E (5) |
| `saida_intervalo` | F (6) |
| `retorno_intervalo` | G (7) |
| `saida` | H (8) |

**Fluxo interno:**

1. Adquire `LockService.getScriptLock()` com espera de 10s.
2. Valida o tipo de ação.
3. Bloqueia intervalos no sábado.
4. Bloqueia `entrada` em dia de folga.
5. Descobre a próxima ação esperada pelo último registro do dia.
6. Cria a linha (primeira ação) ou reutiliza a existente.
7. Verifica se o horário já foi preenchido.
8. Grava o horário e a geolocalização.
9. Recalcula `totalHoras`.
10. Libera o lock no `finally`.

**Retorno de sucesso:**

```js
{
  success: true,
  message: 'Registrado às 08:00:00',
  record: {
    entrada: '08:00:00',
    saidaIntervalo: '',
    retornoIntervalo: '',
    saida: '',
    totalHoras: ''
  }
}
```

**Mensagens de erro comuns:**

- `Ação inválida.`
- `Aba de registro não encontrada.`
- `Sábado não permite intervalo. Apenas Entrada e Saída.`
- `Hoje é dia de folga para este funcionário.`
- `Jornada já finalizada.`
- `Ação incorreta. Atualize a página.`
- `Horário já registrado.`

---

## Consultas e dashboard

### `getWorkingEmployees()`

Retorna quem tem registro hoje (primeiro registro por funcionário):

```js
[{ id: 1, nome: 'João Silva', entrada: '08:00:00', saida: '', status: 'Trabalhando' }]
```

`status` é `'Trabalhando'` quando há entrada e ainda não há saída; caso contrário, `'Saiu'`.

### `getDashboardData()`

Consolida os indicadores do painel:

```js
{
  totalFunc: 10,
  presentes: 8,
  ausentes: 2,
  extrasHoje: '1.5h',
  extrasMes: '12.0h',
  diasComExtra: 7,
  cargaHorariaPrevista: '80.0h',
  bancoHorasTotal: '3.2h'
}
```

- Considera hora extra todo dia com `totalHoras > 8`.
- `cargaHorariaPrevista` soma **uma carga diária por funcionário** (não multiplica pelos dias úteis do mês).
- `bancoHorasTotal` soma `calcularBancoHoras` do mês corrente.
- O `catch` e o retorno antecipado têm formatos ligeiramente diferentes (o segundo omite os dois últimos campos).

### `getListaUsuarios()`

Lista os funcionários da aba `usuario`:

```js
[{ id: 1, usuario: 'joao', nome: 'João Silva', email: 'joao@empresa.com', ativo: true }]
```

- `nome` cai para o `username` se estiver vazio.
- `ativo` é sempre `true` (não há coluna de status).

### `getRegistrosFiltrados(dataInicio, dataFim)`

Retorna registros entre duas datas `dd/MM/yyyy` (inclusive), do mais recente para o mais antigo.

```js
[{
  id: 1, idFunc: 1, nome: 'João Silva', data: '02/11/2026',
  entrada: '08:00:00', saidaIntervalo: '12:00:00',
  retornoIntervalo: '13:00:00', saida: '17:00:00', totalHoras: '08:00'
}]
```

- As datas são convertidas com `parseDateBR` e comparadas como `Date`, então o filtro funciona corretamente entre meses e anos.
- Filtros vazios são ignorados (retorna tudo).

---

## Configurações

### `salvarConfiguracoes(config)`

Grava o objeto JSON em `PropertiesService.getScriptProperties()` na chave `configSistema`.

```js
salvarConfiguracoes({ cargaHorariaDia: 8, permitirSabado: false, notificacoes: true });
// → { success: true }
```

### `carregarConfiguracoes()`

Lê a chave `configSistema` e mescla com o padrão:

```js
{ cargaHorariaDia: 8, permitirSabado: false, notificacoes: true }
```

- Se não houver valor salvo ou o JSON for inválido, retorna o padrão.
- Essas configurações **ainda não são aplicadas** no cálculo de horas nem no registro; servem hoje apenas para a tela de Ajustes.

---

## Constantes globais

| Constante | Valor | Uso |
|---|---|---|
| `TIMEZONE` | `"America/Sao_Paulo"` | Formatação de datas/horas |
| `DIAS_SEMANA` | `['Domingo', ..., 'Sábado']` | Referência (não usada diretamente) |
| `ESCALAS_DISPONIVEIS` | Objeto com 4 tipos | Referência de cargas (não usado diretamente) |

---

## Boas práticas ao alterar o backend

1. Mantenha o retorno `{ success, message }` para funções chamadas pelo frontend.
2. Use `LockService` em qualquer escrita sujeita a concorrência.
3. Use `parseDateBR`/`formatDateBR` para qualquer data em formato brasileiro — não use `new Date(string)`.
4. Registre erros com `Logger.log` e devolva mensagens amigáveis.
5. Evite `getDataRange()` em abas muito grandes; considere `getRange` com limites.
6. Prefira editar registros por `atualizarRegistro` em vez de orientar edição manual na planilha.
7. Após alterar, rode `clasp push` e teste no Web App.
