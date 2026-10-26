# mymemory.md - Registro de Alterações e Memória do Projeto Controle de Ponto

## Estado Atual (26/10/2026)
- Projeto: Google Apps Script vinculado a planilha de controle de ponto
- Última análise completa: realizada com todas as funcionalidades mapeadas
- Nenhuma alteração de código foi feita (conforme solicitado)

## O que Foi Discutido e Precisa de Adequação

### 1. Escala 5x2 (5 dias trabalhados, 2 de folga)
- **Base legal**: Art. 7º, XIII da CF/88 (44h semanais), Art. 58 CLT (8h diárias), Art. 66 (interjornada 11h), Art. 71 (intervalo 1h)
- **Configurações possíveis**:
  - 5x2 de 40h: 5 dias x 8h (sexta à folga sábado/domingo)
  - 5x2 de 44h: 5 dias x carga maior, sábado/domingo folga
  - 5x2 com sábado parcial: 2ª a 6ª 8h + sábado 4h, domingo DSR
- **Necessário adicionar ao sistema**:
  - Tipo de escala configurável por funcionário ou global
  - Dias de folga configuráveis (atualmente só bloqueia sábado)
  - Validação de folga ao registrar ponto

### 2. Recalculo de Total de Horas quando Admin Edita
- **PROBLEMA IDENTIFICADO**: Quando admin edita manualmente horário na planilha, o campo `totalHoras` (coluna I) não é recalculado porque é valor estático gravado pelo código
- **Como funciona hoje**: `utils.js` linha 245: `sheet.getRange(rowToUpdate, 9).setValue(totalHoras)` - escreve texto fixo
- **Solução necessária**:
  - Opção A: Converter coluna totalHoras em fórmula do Google Sheets que referencia entrada/saída
  - Opção B: Criar gatilho `onEdit` que dispara recálculo quando admin edita
  - Opção C: Botão "Recalcular" na interface admin

### 3. Lógica de Folha de Ponto para Escala 5x2
- **Atual**: Apenas `permitirSabado: true/false` em Ajustes.html
- **Necessário**:
  - Configuração de dias de folga (quarta e/ou domingo configuráveis)
  - Verificar se `hoje` é dia de folga antes de permitir registro
  - Adaptar página employee.html para mostrar "hoje é dia de folga"
  - Filtrar `getWorkingEmployees()` considerando as folgas

### 4. Banco de Horas (Conforme Portaria MTP 671/2021)
- **Necessário implementar**:
  - Acúmulo de horas extras (até 2h diárias por art. 59 CLT)
  - Banco de horas com limite de 6 ou 12 meses
  - Saldo positivo/negativo por funcionário
  - Relatório AFD/AEJ para conformidade
  - Indicadores no dashboard de saldo atual

### 5. Intervalo Intrajornada (Art. 71 CLT)
- **Atual**: Validação básica de sequência de ações
- **Necessário**:
  - Validar que intervalo mínimo de 1h seja respeitado entre entrada e saida
  - Configuração de intervalos padronizados
  - Aviso se interjornada de 11h entre dias consecutivos for violada

## Endpoints (Funções Servidor - utils.js) para Lembrar

| Função | Parâmetros | Finalidade |
|--------|-----------|------------|
| `doGet(e)` | parâmetro `page` | Roteamento de páginas HTML |
| `processLogin(username, password)` | usuário, senha | Autenticação (admin ou usuário) |
| `registerClockAction(employeeId, employeeName, actionType, geoLocation)` | idFunc, nome, tipo(entrada/saida/int/out), geoloc | Registrar ponto com validação de sequência |
| `getDashboardData()` | nenhum | Estatísticas: totalFunc, presentes, ausentes, extras |
| `getWorkingEmployees()` | nenhum | Lista quem está trabalhando hoje |
| `getListaUsuarios()` | nenhum | Lista todos os usuários/funcionários |
| `getRegistrosFiltrados(dataInicio, dataFim)` | datas início/fim | Registros filtrados por período |
| `salvarConfiguracoes(config)` | objeto config | Salvar cargaHorariaDia, permitirSabado, notificações |
| `carregarConfiguracoes()` | nenhum | Carregar configurações salvas ou padrão |
| `getLatestEmployeeRecord(employeeId)` | idFuncionário | Último registro do dia do funcionário |

### Funções Auxiliares Importantes
- `calculateTotalHours(entrada, saidaIntervalo, retornoIntervalo, saida)` - calcula total
- `formatTimeForDisplay(valor)` - formata para exibição
- `parseTime(str)` - converte string para objeto tempo
- `timeToMinutes(obj)` - converte para minutos

## Mudanças Planeadas (Não Implementadas Ainda)

### Prioridade Alta
1. ✅ **Converter totalHoras em fórmula do Google Sheets** (ou onEdit trigger) - CRÍTICO para recálculo quando admin edita
2. ✅ **Adicionar configuração de escala 5x2** (tipo 40h/44h/sábado parcial)
3. ✅ **Implementar banco de horas** com controle automático
4. ✅ **Adicionar validação de folga** (quarta/domingo configuráveis)
5. ✅ **Validar intervalo 1h intrajornada** (Art. 71 CLT)

### Prioridade Média
6. ✅ **Atualizar dashboard** para mostrar carga prevista vs cumprida + saldo banco horas
7. ✅ **Relatórios NR-1/AFD/AEJ** conforme Portaria 671/2021
8. ✅ **Página employee.html** adaptada para mostrar escala e saldo
9. ✅ **Filtros por escala** nas páginas admin e registros

### Prioridade Baixa
10. ✅ **Refatorar leituras de aba** para evitar timeout em planilhas grandes
11. ✅ **Migrar senhas para hash** (segurança melhorada)
12. ✅ **Adicionar validação de interjornada 11h** (NR-1 atualizada)

## O que NÃO Deve Ser Mexido (Sem Conversa)
- Senhas em texto plano na planilha (risco de segurança conhecido)
- Estrutura `doGet` sem compreender impacto no roteamento
- Acesso `ANYONE` sem reestruturar autenticação
- `LockService` remoção sem substituição
- Coluna totalHoras se converter para fórmula sem testar impactos

## Próximos Passos (Quando Decidir Continuar)
1. Decidir quais funcionalidades 5x2 implementar primeiro
2. Criar mecanismo de recálculo de totalHoras
3. Adicionar campos de configuração de escala no sistema
4. Testar com dados reais de funcionários
5. Gerar relatórios de conformidade NR-1

---
*Este arquivo será atualizado conforme alterações são realizadas. Para continuar deste ponto, consultar as seções "O que Foi Discutido" e "Endpoints".*