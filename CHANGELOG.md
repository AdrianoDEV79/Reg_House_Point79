# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento semântico ([SemVer](https://semver.org/lang/pt-BR/)).

---

## [Não lançado]

### A fazer

- Corrigir o parse de datas `dd/MM/yyyy` em `isDiaFolga`.
- Exibir `cargaHorariaPrevista` e `bancoHorasTotal` no dashboard.
- Carregar a escala salva ao selecionar um funcionário em Ajustes.
- Revisar o cálculo de carga prevista mensal.
- Implementar histórico, relatório PDF e exportação.
- Adicionar testes automatizados.

---

## [2.0.0] — 2026-11-02

### Adicionado

- **Escala 5x2 por funcionário** na aba `config_escala`:
  - `getEscalaFuncionario`, `isDiaFolga`, `salvarEscalaFuncionario`, `getTodasEscalas`.
  - Tipos: `5x2_40h`, `5x2_44h`, `5x2_sabado_parcial`, `personalizado`.
  - Folgas configuráveis por dia da semana (`1`=Seg … `7`=Dom), com padrão `3,7`.
- **Bloqueio de entrada em dia de folga** no backend (`registerClockAction`) e na tela do funcionário.
- **Recálculo automático de `totalHoras`**:
  - `recalcularTotalHoras(rowIndex)`.
  - Trigger `onEdit` para edições manuais nas colunas E–H.
- **Banco de horas**:
  - `calcularBancoHoras(employeeId, mes, ano)`.
  - `getBancoHoras(employeeId)` para o mês atual.
  - `getBancoHorasTodos()` para todos os funcionários.
- **Novos campos no dashboard**: `cargaHorariaPrevista` e `bancoHorasTotal` em `getDashboardData`.
- **Seção "Escala por Funcionário"** em `Ajustes.html`, com seleção de funcionário, tipo, folgas e cargas.
- Constantes `DIAS_SEMANA` e `ESCALAS_DISPONIVEIS`.
- Documentação: `README.md`, `docs/PLANILHA.md`, `docs/FUNCOES.md`, `docs/ARQUITETURA.md` e este changelog.

### Alterado

- `registerClockAction` passou a validar folga antes de registrar a entrada.
- `getDashboardData` passou a calcular carga prevista e banco de horas total.
- `employee.html` desabilita o botão e mostra "Dia de Folga" quando aplicável.
- `AGENTS.md` e `mymemory.md` atualizados com a nova estrutura.

### Observações

- A tela de dashboard ainda não consome os novos campos (Carga Prevista permanece fixa em `176h`).
- O cadastro de escala não recarrega valores existentes ao trocar o funcionário.
- O cálculo de banco de horas considera apenas dias com registro.

---

## [1.0.0] — 2026-10-26

### Adicionado

- Estrutura inicial do projeto em Google Apps Script (V8).
- Roteamento de páginas por `doGet` (`geral`, `equipe`, `registros`, `ajustes`, `regPonto`, login).
- Autenticação de admin e funcionário via planilha (`processLogin`).
- Registro de ponto com sequência Entrada → Saída Intervalo → Retorno Intervalo → Saída.
- Cálculo de total de horas (`calculateTotalHours`).
- Regra de sábado (somente entrada e saída).
- Dashboard administrativo com indicadores e gráficos (Chart.js).
- Páginas de equipe, registros por período e ajustes.
- Configurações em `PropertiesService` (`configSistema`).
- Captura de geolocalização no navegador.
- `LockService` no registro de ponto.
- Documentação inicial (`AGENTS.md`, `mymemory.md`).

### Segurança

- Senhas em texto plano nas abas `admin` e `usuario`.
- Web App com acesso `ANYONE` e execução como usuário que acessa.
- Sessão apenas em `sessionStorage`.
