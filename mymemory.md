# mymemory.md - Registro de Alterações e Memória do Projeto Controle de Ponto

## Estado Atual (26/10/2026)
- Projeto: Google Apps Script vinculado a planilha de controle de ponto
- **ALTERAÇÕES IMPLEMENTADAS**: escala 5x2, banco de horas, recálculo automático de totalHoras
- Arquivos modificados: `utils.js`, `Ajustes.html`, `employee.html`, `AGENTS.md`, `mymemory.md`

---

## ✅ ALTERAÇÕES IMPLEMENTADAS NO CÓDIGO

### 1. utils.js - Novas Funções
| Função | Finalidade |
|--------|-----------|
| `getEscalaFuncionario(employeeId)` | Retorna configuração de escala do funcionário |
| `isDiaFolga(employeeId, dataStr)` | Verifica se a data é dia de folga |
| `salvarEscalaFuncionario(...)` | Salva configuração de escala na aba `config_escala` |
| `getTodasEscalas()` | Lista todas as escalas cadastradas |
| `recalcularTotalHoras(rowIndex)` | Recalcula total de horas de uma linha específica |
| `onEdit(e)` | Trigger automático - recalcula quando admin edita colunas 5-8 |
| `calcularBancoHoras(employeeId, mes, ano)` | Calcula banco de horas do mês |
| `getBancoHoras(employeeId)` | Retorna banco de horas do mês atual |
| `getBancoHorasTodos()` | Lista banco de horas de todos funcionários |

### 2. utils.js - Funções Modificadas
| Função | Alteração |
|--------|-----------|
| `registerClockAction()` | Adicionada verificação de dia de folga antes de permitir entrada |
| `getDashboardData()` | Adicionados campos `cargaHorariaPrevista` e `bancoHorasTotal` |

### 3. Ajustes.html - Nova Seção
- Formulário para configurar escala por funcionário
- Select de funcionário, tipo de escala (5x2 40h/44h/sábado parcial/personalizado)
- Campos para dias de folga, carga horária diária e sábado
- Botão "Salvar Escala do Funcionário"

### 4. employee.html - Alteração
- Verifica se hoje é dia de folga antes de permitir registro
- Desabilita botão de ponto se for dia de folga

---

## 📋 ALTERAÇÕES MANUAIS NECESSÁRIAS NA PLANILHA

### 1. Criar a aba `config_escala`
Na planilha Google Sheets, crie uma nova aba chamada **`config_escala`** com as seguintes colunas na linha 1:

| Coluna | Cabeçalho | Exemplo |
|--------|-----------|---------|
| A | idFuncionario | 1 |
| B | tipoEscala | 5x2_40h |
| C | folgas | 3,7 |
| D | cargaDiaria | 8 |
| E | cargaSabado | 0 |

**Valores para coluna C (folgas):**
- 1 = Segunda-feira
- 2 = Terça-feira
- 3 = Quarta-feira ← **folga padrão**
- 4 = Quinta-feira
- 5 = Sexta-feira
- 6 = Sábado
- 7 = Domingo ← **folga padrão**

Exemplo para escala 5x2 com folga quarta e domingo: `3,7`

### 2. Configurar Trigger `onEdit` (OBRIGATÓRIO para recálculo automático)

No editor do Google Apps Script:
1. Clique em **Editar → Gatilhos do projeto atual**
2. Clique em **+ Adicionar Gatilho**
3. Escolha a função: **`onEdit`**
4. Tipo de evento: **Do planilha → Ao editar**
5. Salve

Esse trigger garante que quando o admin editar células de entrada/saída na planilha, o `totalHoras` seja recalculado automaticamente.

### 3. Cadastrar escalas dos funcionários
Na página **Ajustes** do sistema:
1. Selecione o funcionário no dropdown
2. Escolha o tipo de escala
3. Informe os dias de folga (ex: 3,7 para quarta e domingo)
4. Informe carga horária diária e sábado
5. Clique em "Salvar Escala do Funcionário"

Isso criará/atualizará automaticamente a linha na aba `config_escala`.

---

## 📋 ENDPOINTS ATUALIZADOS (Funções Servidor)

| Função | Parâmetros | Finalidade |
|--------|-----------|------------|
| `doGet(e)` | parâmetro `page` | Roteamento de páginas HTML |
| `processLogin(username, password)` | usuário, senha | Autenticação (admin ou usuário) |
| `registerClockAction(...)` | idFunc, nome, tipo, geoloc | Registrar ponto (verifica dia de folga) |
| `getDashboardData()` | nenhum | Estatísticas (inclui bancoHorasTotal, cargaHorariaPrevista) |
| `getWorkingEmployees()` | nenhum | Lista quem está trabalhando hoje |
| `getListaUsuarios()` | nenhum | Lista todos os usuários/funcionários |
| `getRegistrosFiltrados(dataInicio, dataFim)` | datas | Registros filtrados por período |
| `salvarConfiguracoes(config)` | objeto config | Salvar cargaHorariaDia, permitirSabado, notificações |
| `carregarConfiguracoes()` | nenhum | Carregar configurações salvas ou padrão |
| `getLatestEmployeeRecord(employeeId)` | idFuncionário | Último registro do dia do funcionário |
| `getEscalaFuncionario(employeeId)` | idFuncionário | Configuração de escala do funcionário |
| `isDiaFolga(employeeId, dataStr)` | idFunc, data | Verifica se é dia de folga |
| `salvarEscalaFuncionario(id, tipo, folgas, cargaDia, cargaSab)` | vários | Salvar escala do funcionário |
| `getTodasEscalas()` | nenhum | Lista todas as escalas |
| `recalcularTotalHoras(rowIndex)` | linha da planilha | Recalcular total de horas |
| `calcularBancoHoras(employeeId, mes, ano)` | id, mês, ano | Calcular banco de horas |
| `getBancoHoras(employeeId)` | idFuncionário | Banco de horas do mês atual |
| `getBancoHorasTodos()` | nenhum | Banco de horas de todos |

### Funções Auxiliares
- `calculateTotalHours(entrada, saidaIntervalo, retornoIntervalo, saida)` - calcula total
- `formatTimeForDisplay(valor)` - formata para exibição
- `parseTime(str)` - converte string para objeto tempo
- `timeToMinutes(obj)` - converte para minutos

---

## O que NÃO Deve Ser Mexido (Sem Conversa)
- Senhas em texto plano na planilha
- Estrutura `doGet` sem compreender impacto no roteamento
- Acesso `ANYONE` sem reestruturar autenticação
- `LockService` remoção sem substituição
- Trigger `onEdit` não pode ser removido se quiser recálculo automático

---

## Documentação Oficial
- `README.md` — visão geral, stack, setup, deploy, rotas e limitações
- `docs/PLANILHA.md` — abas, colunas, `config_escala` e trigger `onEdit`
- `docs/FUNCOES.md` — referência de todas as funções do backend
- `docs/ARQUITETURA.md` — fluxos, diagramas Mermaid e decisões técnicas
- `CHANGELOG.md` — histórico de versões (2.0.0 e 1.0.0)

## Próximos Passos
1. Configurar trigger `onEdit` no Google Apps Script (obrigatório para recálculo automático)
2. Criar aba `config_escala` na planilha
3. Cadastrar escalas dos funcionários via página Ajustes
4. Testar com dados reais de funcionários

### Pendências conhecidas
1. `isDiaFolga` usa `new Date('dd/MM/yyyy')`, que o V8 interpreta como `mm/dd/yyyy` — corrigir com parse manual.
2. Dashboard não consome `cargaHorariaPrevista` e `bancoHorasTotal`; "Carga Prevista" segue fixa em 176h.
3. Ajustes não recarrega a escala salva ao selecionar o funcionário.
4. Carga prevista mensal soma apenas uma carga diária por funcionário.
5. Banco de horas ignora faltas, feriados e carga de sábado.

---
*Este arquivo será atualizado conforme alterações são realizadas.*