# AGENTS.md - Controle de Ponto Google Apps Script

## 1. O que o sistema faz
Sistema de controle de ponto eletrônico para Google Apps Script, vinculado a uma planilha. Permite registro de entrada/saída/intervalos, autenticação login, dashboard/admin com estatísticas, gestão de equipe e relatórios por período. Funciona como web app: páginas HTML comunicam com backend Apps Script que lê/escreve em Google Sheets.

## 2. Tecnologias e como rodar
- **Google Apps Script (V8)** no `utils.js` (backend)
- **HTML/CSS/JS** em arquivos `*.html` (frontend)
- **Google Sheets** como banco de dados (abas: `registro_ponto`, `admin`, `usuario`)
- **Google Services**: `SpreadsheetApp`, `HtmlService`, `PropertiesService`, `LockService`
- **CLI**: `clasp` para desenvolvimento local (`clasp push/pull`)

## 3. Estrutura de pastas
```
registro de ponto/
├── .clasp.json          -> scriptId: 11JmmN58L8HN8jgYAIR3tGQzRt6QO0zOy2FkEl5CyUwvqFmdCT8qgwkcH
├── appsscript.json      -> manifesto (timezone America/Sao_Paulo, runtime V8, escopos)
├── utils.js             -> lógica completa do backend
├── admin.html           -> painel administrativo/dashboard
├── Ajustes.html         -> configurações do sistema
├── employee.html        -> página do funcionário (bater ponto)
├── Equipe.html          -> listagem de funcionários
├── login.html           -> tela de login
└── Registros.html       -> consulta de registros por data
```

## 4. Telas/funcionalidades e conexão
Fluxo: `login.html` → `processLogin()` → sucesso redireciona para `?page=regPonto` (employee.html). Das páginas:
- `employee.html`: `registerClockAction()` → atualiza planilha
- `admin.html`: `getDashboardData()` + `getWorkingEmployees()`
- `equipe.html`: `getListaUsuarios()`
- `registros.html`: `getRegistrosFiltrados(dataInicio, dataFim)`
- `ajustes.html`: `salvarConfiguracoes()` / `carregarConfiguracoes()`
Todas usam `google.script.run` com `withSuccessHandler` / `withFailureHandler`.

## 5. Banco de dados (planilhas)
### `registro_ponto` (principal)
- [0]idRegistro, [1]idFuncionario, [2]nome, [3]data, [4]entrada, [5]saidaIntervalo, [6]retornoIntervalo, [7]saida, [8]totalHoras, [9]geolocalizacao, [10]observacoes

### `admin`
- [0]id, [1]username, [2]password, [3]nome (autenticação admin)

### `usuario`
- [0]id, [1]username, [2]password, [3]nome, [4]email (autenticação funcionário)

### Relações
- Funcionário (id em `usuario`) tem muitos registros em `registro_ponto` via `idFuncionario`
- Login valida contra `admin` ou `usuario` aba

## 6. Padrões de código e layout
### Código (utils.js)
- Blocos comentados `// ============================================================`
- Constantes no topo (`TIMEZONE`)
- Funções puras com try/catch + Logger.log
- `LockService` em `registerClockAction` (10s wait)
- `Utilities.formatDate()` para data/hora

### Layout (HTML)
- CSS próprio com variáveis `:root { --primary: #2563EB; ... }`
- Fontes: Inter + Font Awesome
- Navbar fixa `bottom-nav` em todas páginas
- Grid system: `.stats-grid`, `.card`, `.form-group`
- Metatags viewport em todas páginas

### Comunicação cliente-servidor
- `google.script.run` com handlers de sucesso/erro
- Funções retornam JSON: `{ success: boolean, message: string, ...dados }`
- Nomes consistentes: `processLogin`, `registerClockAction`, etc.

## 7. Pontos frágeis / não mexer sem cuidado
1. **Senhas em texto plano** (utils.js linhas 62-86) - comparado diretamente
2. **totalHoras é valor estático** - não fórmula; editar célula não recalcula
3. **Acesso ANYONE** no appsscript.json - "proteção" só pelo login interno
4. **doGet não valida sessão servidor** - páginas protegidas só via sessionStorage cliente
5. **Geolocalização não validada** - vem do cliente livremente
6. **Leituras completas de aba** (`getDataRange()`) - pode causar timeout em planilhas grandes
7. **NR-11/11 interjornada 11h** - código não verifica, adicionar validação sem estudar casos
8. **`script.external_request`** - parece não usar; confirmar antes de remover

**Resumo**: Sistema robusto, mas atenção a segurança (senhas planas) ePerformance (leituras completas). Fluxo: login → registrar → dashboard/relatórios.