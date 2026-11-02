# 🕒 Controle de Ponto

Sistema web de **controle de ponto eletrônico** feito em **Google Apps Script (V8)**, com **Google Sheets como banco de dados** e interface mobile-first em HTML/CSS/JS.

O funcionário faz login, registra entrada, intervalos e saída; o administrador acompanha o dashboard, a equipe, os registros por período e as configurações — incluindo **escala 5x2 por funcionário**, **bloqueio em dia de folga** e **banco de horas**.

> Documentação detalhada em [`docs/`](docs/): [Planilha](docs/PLANILHA.md) · [Funções do backend](docs/FUNCOES.md) · [Arquitetura](docs/ARQUITETURA.md) · [Changelog](CHANGELOG.md)

---

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Rotas e páginas](#rotas-e-páginas)
- [Como executar e publicar](#como-executar-e-publicar)
- [Configuração inicial](#configuração-inicial)
- [Regras de negócio](#regras-de-negócio)
- [API do backend](#api-do-backend)
- [Segurança e limitações](#segurança-e-limitações)
- [Pendências e roadmap](#pendências-e-roadmap)
- [Fluxo de desenvolvimento](#fluxo-de-desenvolvimento)

---

## Visão geral

| Item | Descrição |
|---|---|
| **Tipo** | Aplicação web interna (Google Apps Script Web App) |
| **Backend** | `utils.js` — funções globais executadas no servidor do Apps Script |
| **Frontend** | 6 páginas HTML independentes, sem framework |
| **Banco de dados** | Google Sheets (4 abas) |
| **Autenticação** | Login validado nas abas `admin` e `usuario` da planilha |
| **Sessão** | `sessionStorage` no navegador (não há sessão no servidor) |
| **Fuso horário** | `America/Sao_Paulo` |
| **Distribuição** | `clasp` (CLI do Google Apps Script) |
| **Versão atual** | 2.0 — ver [CHANGELOG](CHANGELOG.md) |

O sistema é vinculado a **uma planilha específica** (`SpreadsheetApp.getActiveSpreadsheet()`), ou seja, o script precisa estar anexado à planilha de ponto.

---

## Funcionalidades

### Funcionário
- Login com usuário e senha (aba `usuario`).
- Registro sequencial: **Entrada → Saída Intervalo → Retorno Intervalo → Saída**.
- Validação da ação esperada no servidor (evita duplo clique e registro fora de ordem).
- Exibição da jornada do dia e do total de horas trabalhadas.
- Captura de **geolocalização** do navegador (apenas informativa, gravada na planilha).
- **Bloqueio em dia de folga** conforme a escala do funcionário.
- Regra especial de **sábado**: somente Entrada e Saída, sem intervalos.

### Administrador
- Dashboard com total de funcionários, presentes, ausentes e extras do dia.
- Resumo do mês: extras, dias com hora extra e carga prevista.
- Lista de quem está trabalhando agora.
- Consulta de registros por período (`dataInicio` / `dataFim`).
- Lista da equipe com busca por nome/usuário.
- Ajustes: carga horária padrão, permissão de sábado, notificações.
- **Escala por funcionário**: tipo de escala, dias de folga, carga diária e carga de sábado.

### Automações
- `totalHoras` recalculado automaticamente quando o admin edita as colunas de horário na planilha (trigger `onEdit`).
- **Banco de horas** mensal por funcionário (horas trabalhadas − carga prevista).
- Cálculo de horas extras acima da carga diária.

---

## Stack

- **Google Apps Script V8** — runtime do backend.
- **Google Sheets** — persistência (`SpreadsheetApp`).
- **HtmlService** — entrega das páginas.
- **PropertiesService** — configurações globais (`configSistema`).
- **LockService** — serialização do registro de ponto.
- **Utilities.formatDate** — datas/horas no fuso de São Paulo.
- **Chart.js 4** — gráficos do dashboard (CDN).
- **Font Awesome 6.4** e **Inter** — ícones e tipografia (CDN).
- **clasp** — sincronização local ↔ Apps Script.

Sem Node.js em runtime, sem banco relacional, sem build step.

---

## Estrutura do projeto

```text
registro de ponto/
├── .clasp.json          # Configuração do clasp (scriptId do projeto)
├── appsscript.json      # Manifesto: timezone, runtime V8, webapp, escopos
├── utils.js             # Backend completo (roteamento, auth, ponto, escala, banco de horas)
├── login.html           # Tela de login
├── employee.html        # Página do funcionário (bater ponto)
├── admin.html           # Dashboard administrativo
├── Equipe.html          # Listagem da equipe
├── Registros.html       # Consulta de registros por período
├── Ajustes.html         # Configurações + escala por funcionário
├── AGENTS.md            # Contexto resumido para agentes de IA
├── mymemory.md          # Memória de alterações do projeto
├── CHANGELOG.md         # Histórico de versões
├── README.md            # Este arquivo
└── docs/
    ├── PLANILHA.md      # Estrutura das abas e configuração manual
    ├── FUNCOES.md       # Referência das funções do backend
    └── ARQUITETURA.md   # Fluxos, diagramas e decisões técnicas
```

---

## Rotas e páginas

O roteamento é feito por `doGet(e)` em `utils.js`, usando o parâmetro `?page=`:

| URL | Página servida | Perfil |
|---|---|---|
| `/exec` (sem parâmetro) | `login.html` | Público |
| `?page=login` | `login.html` | Público |
| `?page=regPonto` | `employee.html` | Funcionário |
| `?page=geral` | `admin.html` | Admin |
| `?page=equipe` | `Equipe.html` | Admin |
| `?page=registros` | `Registros.html` | Admin |
| `?page=ajustes` | `Ajustes.html` | Admin |

> ⚠️ O `doGet` referencia os arquivos em minúsculas (`equipe`, `registros`, `ajustes`). No repositório os arquivos estão capitalizados (`Equipe.html`, etc.). O Apps Script diferencia maiúsculas/minúsculas — confirme que os nomes no projeto online coincidem com as chamadas.

---

## Como executar e publicar

### Pré-requisitos

- Conta Google com acesso à planilha de ponto.
- Projeto no Google Apps Script vinculado a essa planilha.
- [Node.js](https://nodejs.org/) e [clasp](https://github.com/google/clasp) instalados.

### Instalação local

```bash
npm install -g @google/clasp
clasp login
git clone https://github.com/AdrianoDEV79/Reg_House_Point79.git
cd Reg_House_Point79
```

O arquivo `.clasp.json` já aponta para o projeto (`scriptId`). Para enviar as alterações:

```bash
clasp push          # envia os arquivos locais para o Apps Script
clasp push --watch  # envia automaticamente a cada alteração
```

Para trazer alterações feitas no editor online:

```bash
clasp pull
```

### Publicar o Web App

1. No editor do Apps Script: **Implantar → Nova implantação**.
2. Tipo: **App da Web**.
3. Executar como: **Usuário que acessa** (definido em `appsscript.json`).
4. Quem tem acesso: **Qualquer pessoa** (definido em `appsscript.json`).
5. Copie a URL `/exec` e distribua aos usuários.

Configuração atual do manifesto:

```json
"webapp": {
  "executeAs": "USER_ACCESSING",
  "access": "ANYONE"
}
```

> Como `executeAs` é `USER_ACCESSING`, cada acesso usa a conta Google do próprio usuário. O acesso "qualquer pessoa" significa qualquer conta Google — a proteção real é o login interno do sistema.

---

## Configuração inicial

Resumo; o passo a passo completo está em [`docs/PLANILHA.md`](docs/PLANILHA.md).

1. **Criar as abas** na planilha:
   - `registro_ponto` — registros de ponto.
   - `admin` — usuários administradores.
   - `usuario` — funcionários.
   - `config_escala` — escala por funcionário (criada automaticamente no primeiro salvamento, mas pode ser criada manualmente).
2. **Preencher os cabeçalhos** exatamente na linha 1 (os dados começam na linha 2).
3. **Cadastrar** pelo menos um admin e um funcionário.
4. **Configurar o trigger `onEdit`** no Apps Script (Editar → Gatilhos do projeto) para o recálculo automático de `totalHoras`.
5. **Cadastrar as escalas** em `Ajustes → Escala por Funcionário`.

### Exemplo mínimo da aba `usuario`

| A | B | C | D | E |
|---|---|---|---|---|
| id | username | password | nome | email |
| 1 | joao | 1234 | João Silva | joao@empresa.com |

### Exemplo mínimo da aba `config_escala`

| A | B | C | D | E |
|---|---|---|---|---|
| idFuncionario | tipoEscala | folgas | cargaDiaria | cargaSabado |
| 1 | 5x2_40h | 3,7 | 8 | 0 |

`folgas`: `1`=Seg, `2`=Ter, `3`=Qua, `4`=Qui, `5`=Sex, `6`=Sáb, `7`=Dom. Ex.: `3,7` = quarta e domingo.

---

## Regras de negócio

### Sequência de registro

O servidor calcula a próxima ação esperada a partir do último registro do dia:

```text
( sem registro ) → entrada
entrada         → saida_intervalo
saida_intervalo → retorno_intervalo
retorno_intervalo → saida
saida           → jornada finalizada
```

Se a ação enviada não for a esperada, retorna `{ success: false, message: 'Ação incorreta. Atualize a página.' }`.

### Sábado

- `Utilities.formatDate(now, TIMEZONE, 'u') === '6'` identifica sábado.
- São permitidas apenas `entrada` e `saida`; `saida_intervalo`/`retorno_intervalo` são rejeitados.

### Dia de folga

- `isDiaFolga(employeeId, data)` consulta `getEscalaFuncionario` e compara o dia da semana com a lista `folgas`.
- No registro, uma `entrada` em dia de folga é recusada.
- Na tela do funcionário, o botão é desabilitado e o status vira "Dia de Folga".

### Cálculo de horas

```text
total = (saída − entrada) − (retorno do intervalo − saída do intervalo)
```

- Se faltar entrada ou saída, retorna vazio.
- Se o intervalo for inválido/negativo, é ignorado.
- Se o total for negativo, retorna vazio.
- Formato final: `HH:mm`.

### Horas extras e banco de horas

- **Extras do dia**: horas acima de 8h no registro.
- **Extras do mês**: soma dos excedentes diários.
- **Banco de horas atual**: `soma(totalHoras dos dias do mês) − (dias trabalhados × cargaDiaria)`.

> A regra atual considera apenas dias com registro. Faltas, feriados e a carga de sábado ainda não entram no cálculo.

---

## API do backend

As páginas chamam funções globais via `google.script.run`. O contrato padrão é:

```js
{ success: boolean, message?: string, ...dados }
```

Referência completa em [`docs/FUNCOES.md`](docs/FUNCOES.md). Resumo:

| Grupo | Funções |
|---|---|
| Roteamento | `doGet`, `include` |
| Autenticação | `processLogin` |
| Tempo | `formatTimeForDisplay`, `formatDurationForDisplay`, `parseTime`, `timeToMinutes`, `calculateTotalHours` |
| Escala | `getEscalaFuncionario`, `isDiaFolga`, `salvarEscalaFuncionario`, `getTodasEscalas` |
| Recálculo | `recalcularTotalHoras`, `onEdit` |
| Banco de horas | `calcularBancoHoras`, `getBancoHoras`, `getBancoHorasTodos` |
| Ponto | `getLatestEmployeeRecord`, `registerClockAction` |
| Consultas | `getWorkingEmployees`, `getDashboardData`, `getListaUsuarios`, `getRegistrosFiltrados` |
| Configurações | `salvarConfiguracoes`, `carregarConfiguracoes` |

---

## Segurança e limitações

Este é um sistema interno e algumas decisões são simplificadas de propósito. Antes de usar com dados sensíveis, avalie os pontos abaixo.

| Ponto | Situação atual |
|---|---|
| **Senhas** | Armazenadas em texto plano nas abas `admin` e `usuario`; comparação direta. |
| **Sessão** | Apenas `sessionStorage` no cliente. O `doGet` não valida sessão no servidor. |
| **Acesso** | `access: ANYONE` no manifesto — qualquer conta Google alcança a URL. |
| **Geolocalização** | Enviada pelo cliente sem validação de distância/cerco. |
| **Autorização** | Páginas admin não verificam `role` no servidor; a separação é só pela navegação. |
| **Leituras** | `getDataRange().getValues()` carrega a aba inteira — pode ficar lento em planilhas grandes. |
| **Trigger** | `onEdit` precisa ser criado manualmente; sem ele não há recálculo automático. |
| **Datas** | Funções esperam strings `dd/MM/yyyy`. Evite `new Date('dd/MM/yyyy')`, que no V8 é interpretado como `mm/dd/yyyy`. |
| **Testes** | Não há suíte automatizada. |

---

## Pendências e roadmap

Itens conhecidos, em ordem sugerida:

1. Corrigir o parse de data em `isDiaFolga` (usar `dd/MM/yyyy` manualmente em vez de `new Date(string)`).
2. Exibir `cargaHorariaPrevista` e `bancoHorasTotal` no dashboard (hoje "Carga Prevista" está fixa em `176h`).
3. Carregar a escala salva ao selecionar o funcionário em `Ajustes.html`.
4. Revisar o cálculo de carga prevista do mês (multiplicar pelos dias úteis, não somar uma carga diária por funcionário).
5. Incluir faltas, feriados e carga de sábado no banco de horas.
6. Implementar "Ver Histórico", "Gerar Relatório" e "Exportar Relatório" (hoje são `alert`).
7. Criar a aba `config_escala` e o trigger `onEdit` no ambiente de produção.
8. Avaliar hash de senhas e sessão assinada no servidor.

---

## Fluxo de desenvolvimento

```bash
# 1. Atualizar o repositório
git pull origin main

# 2. Editar os arquivos localmente

# 3. Enviar para o Apps Script e testar no Web App
clasp push

# 4. Versionar
git add -A
git commit -m "feat: descrição da alteração"
git push origin main
```

Convenção de commits sugerida: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

> `clasp push` e `git push` são independentes: o primeiro publica no Apps Script, o segundo versiona no GitHub. Para o Web App refletir mudanças, é preciso `clasp push` (e, se houver implantação versionada, criar/atualizar a implantação).

---

## Documentação relacionada

- [`docs/PLANILHA.md`](docs/PLANILHA.md) — abas, colunas, exemplos e configuração manual.
- [`docs/FUNCOES.md`](docs/FUNCOES.md) — referência de todas as funções do backend.
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — fluxos, diagramas e decisões técnicas.
- [`CHANGELOG.md`](CHANGELOG.md) — histórico de versões.
- [`AGENTS.md`](AGENTS.md) — resumo de contexto para agentes de IA.
- [`mymemory.md`](mymemory.md) — memória detalhada das alterações.

---

## Licença

Projeto privado de uso interno. Todos os direitos reservados.
