// ============================================================
// SISTEMA DE CONTROLE DE PONTO - GOOGLE APPS SCRIPT
// VERSÃO COMPLETA — com todas as páginas
// ============================================================

const TIMEZONE = "America/Sao_Paulo";

// Dias da semana: 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado, 7=Domingo
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Configurações de escala disponíveis
const ESCALAS_DISPONIVEIS = {
  '5x2_40h': { cargaSemanal: 40, cargaDiaria: 8, nome: '5x2 - 40h semanal (8h/dia)' },
  '5x2_44h': { cargaSemanal: 44, cargaDiaria: 8.8, nome: '5x2 - 44h semanal (8h48m/dia)' },
  '5x2_sabado_parcial': { cargaSemanal: 40, cargaDiaria: 8, nome: '5x2 com sábado parcial (4h)', sabado: true, cargaSabado: 4 },
  'personalizado': { cargaSemanal: 40, cargaDiaria: 8, nome: 'Personalizado' }
};

// ============================================================
// ROTEAMENTO DE PÁGINAS
// ============================================================
function doGet(e) {
  Logger.log("=== doGet chamado ===");
  try {
    if (e && e.parameter.page === 'geral') {
      return HtmlService.createTemplateFromFile('admin').evaluate()
        .setTitle('Admin - Controle de Ponto')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } else if (e && e.parameter.page === 'equipe') {
      return HtmlService.createTemplateFromFile('equipe').evaluate()
        .setTitle('Equipe - Controle de Ponto')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } else if (e && e.parameter.page === 'registros') {
      return HtmlService.createTemplateFromFile('registros').evaluate()
        .setTitle('Registros - Controle de Ponto')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } else if (e && e.parameter.page === 'ajustes') {
      return HtmlService.createTemplateFromFile('ajustes').evaluate()
        .setTitle('Ajustes - Controle de Ponto')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } else if (e && e.parameter.page === 'regPonto') {
      return HtmlService.createTemplateFromFile('employee').evaluate()
        .setTitle('Registro de Ponto')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } else {
      return HtmlService.createTemplateFromFile('login').evaluate()
        .setTitle('Login - Controle de Ponto')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
  } catch (error) {
    Logger.log("ERRO em doGet: " + error.toString());
    return HtmlService.createHtmlOutput("Erro ao carregar página: " + error.toString());
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================
function processLogin(username, password) {
  Logger.log('=== Tentativa de Login ===');
  Logger.log('Usuário: "' + username + '"');
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const adminSheet = ss.getSheetByName('admin');
    if (adminSheet) {
      Logger.log("Aba 'admin' encontrada");
      const adminData = adminSheet.getDataRange().getValues();
      for (let i = 1; i < adminData.length; i++) {
        const sheetUsername = String(adminData[i][1]).trim();
        const sheetPassword = String(adminData[i][2]).trim();
        if (sheetUsername === username && sheetPassword === password) {
          Logger.log('✓ Login ADMIN bem-sucedido: ' + username);
          return { success: true, role: 'admin', name: adminData[i][3] };
        }
      }
    }
    const userSheet = ss.getSheetByName('usuario');
    if (userSheet) {
      Logger.log("Aba 'usuario' encontrada");
      const userData = userSheet.getDataRange().getValues();
      for (let i = 1; i < userData.length; i++) {
        const sheetUsername = String(userData[i][1]).trim();
        const sheetPassword = String(userData[i][2]).trim();
        if (sheetUsername === username && sheetPassword === password) {
          const userId = userData[i][0];
          const userName = userData[i][3];
          Logger.log('✓ Login FUNCIONÁRIO bem-sucedido: ' + username + ' (ID: ' + userId + ')');
          return { success: true, role: 'usuario', userId: userId, userName: userName };
        }
      }
    }
    Logger.log('✗ Login FALHOU: Usuário ou senha inválidos');
    return { success: false, message: 'Usuário ou senha inválidos.' };
  } catch (error) {
    Logger.log("ERRO em processLogin: " + error.toString());
    return { success: false, message: 'Erro ao processar login: ' + error.toString() };
  }
}

// ============================================================
// FUNÇÕES AUXILIARES DE TEMPO
// ============================================================
function formatTimeForDisplay(sheetValue) {
  try {
    if (sheetValue instanceof Date) {
      return Utilities.formatDate(sheetValue, TIMEZONE, 'HH:mm:ss');
    }
    return String(sheetValue || '');
  } catch (e) { return ''; }
}

function formatDurationForDisplay(sheetValue) {
  try {
    if (sheetValue instanceof Date) {
      return Utilities.formatDate(sheetValue, TIMEZONE, 'HH:mm');
    }
    return String(sheetValue || '');
  } catch (e) { return ''; }
}

function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || timeStr.trim() === '') return null;
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2) return null;
  return { hours: parts[0], minutes: parts[1], seconds: parts[2] || 0 };
}

function timeToMinutes(timeObj) {
  if (!timeObj) return 0;
  return timeObj.hours * 60 + timeObj.minutes + (timeObj.seconds / 60);
}

// Converte dd/MM/yyyy (texto ou Date) em Date sem ambiguidade mm/dd.
// Aceita também dd-MM-yyyy, dd.MM.yyyy e ISO (yyyy-MM-dd).
function parseDateBR(value) {
  try {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const texto = String(value).trim();
    const match = texto.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s|$)/);
    if (match) {
      const dia = parseInt(match[1], 10);
      const mes = parseInt(match[2], 10);
      let ano = parseInt(match[3], 10);
      if (ano < 100) ano += 2000;
      const data = new Date(ano, mes - 1, dia);
      const valida = data.getFullYear() === ano &&
        data.getMonth() === mes - 1 &&
        data.getDate() === dia;
      return valida ? data : null;
    }
    const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]|$)/);
    if (iso) {
      const ano = parseInt(iso[1], 10);
      const mes = parseInt(iso[2], 10);
      const dia = parseInt(iso[3], 10);
      const data = new Date(ano, mes - 1, dia);
      const valida = data.getFullYear() === ano &&
        data.getMonth() === mes - 1 &&
        data.getDate() === dia;
      return valida ? data : null;
    }
    const data = new Date(texto);
    return isNaN(data.getTime()) ? null : data;
  } catch (e) {
    return null;
  }
}

// Formata qualquer data aceita por parseDateBR como dd/MM/yyyy.
function formatDateBR(value) {
  const data = parseDateBR(value);
  return data ? Utilities.formatDate(data, TIMEZONE, 'dd/MM/yyyy') : '';
}

function calculateTotalHours(entradaStr, saidaIntervaloStr, retornoIntervaloStr, saidaStr) {
  try {
    const entrada = parseTime(entradaStr);
    const saidaIntervalo = parseTime(saidaIntervaloStr);
    const retornoIntervalo = parseTime(retornoIntervaloStr);
    const saida = parseTime(saidaStr);
    if (!entrada || !saida) return '';
    let totalMinutes = timeToMinutes(saida) - timeToMinutes(entrada);
    if (saidaIntervalo && retornoIntervalo) {
      const intervalMinutes = timeToMinutes(retornoIntervalo) - timeToMinutes(saidaIntervalo);
      if (intervalMinutes > 0) totalMinutes -= intervalMinutes;
    }
    if (totalMinutes < 0) return '';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  } catch (e) { return ''; }
}

// ============================================================
// ESCALA 5X2 - CONFIGURAÇÃO E VALIDAÇÃO DE FOLGAS
// ============================================================

function getEscalaFuncionario(employeeId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const escalaSheet = ss.getSheetByName('config_escala');
    if (!escalaSheet) return { tipo: '5x2_40h', folgas: [3, 7], cargaDiaria: 8 };
    const dados = escalaSheet.getDataRange().getValues();
    for (let i = 1; i < dados.length; i++) {
      if (String(dados[i][0]) === String(employeeId)) {
        return {
          tipo: dados[i][1] || '5x2_40h',
          folgas: dados[i][2] ? String(dados[i][2]).split(',').map(Number) : [3, 7],
          cargaDiaria: dados[i][3] || 8,
          cargaSabado: dados[i][4] || 0
        };
      }
    }
    return { tipo: '5x2_40h', folgas: [3, 7], cargaDiaria: 8 };
  } catch (e) {
    Logger.log('ERRO getEscalaFuncionario: ' + e.toString());
    return { tipo: '5x2_40h', folgas: [3, 7], cargaDiaria: 8 };
  }
}

function isDiaFolga(employeeId, dataStr) {
  try {
    const escala = getEscalaFuncionario(employeeId);
    if (!escala || !escala.folgas) return false;
    const data = parseDateBR(dataStr);
    if (!data) return false;
    let diaSemana = data.getDay();
    if (diaSemana === 0) diaSemana = 7;
    return escala.folgas.includes(diaSemana);
  } catch (e) {
    Logger.log('ERRO isDiaFolga: ' + e.toString());
    return false;
  }
}

function salvarEscalaFuncionario(employeeId, tipo, folgas, cargaDiaria, cargaSabado) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let escalaSheet = ss.getSheetByName('config_escala');
    if (!escalaSheet) {
      escalaSheet = ss.insertSheet('config_escala');
      escalaSheet.appendRow(['idFuncionario', 'tipoEscala', 'folgas', 'cargaDiaria', 'cargaSabado']);
    }
    const dados = escalaSheet.getDataRange().getValues();
    let linhaExistente = -1;
    for (let i = 1; i < dados.length; i++) {
      if (String(dados[i][0]) === String(employeeId)) {
        linhaExistente = i + 1;
        break;
      }
    }
    const linha = [employeeId, tipo, folgas.join(','), cargaDiaria, cargaSabado];
    if (linhaExistente > 0) {
      escalaSheet.getRange(linhaExistente, 1, 1, 5).setValues([linha]);
    } else {
      escalaSheet.appendRow(linha);
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getTodasEscalas() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const escalaSheet = ss.getSheetByName('config_escala');
    if (!escalaSheet) return [];
    const dados = escalaSheet.getDataRange().getValues();
    return dados.slice(1).map(row => ({
      idFuncionario: row[0],
      tipo: row[1] || '5x2_40h',
      folgas: row[2] ? String(row[2]).split(',').map(Number) : [3, 7],
      cargaDiaria: row[3] || 8,
      cargaSabado: row[4] || 0
    }));
  } catch (e) {
    return [];
  }
}

// ============================================================
// RECÁLCULO DE TOTAL DE HORAS (PARA EDIÇÃO MANUAL DO ADMIN)
// ============================================================

function recalcularTotalHoras(rowIndex) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('registro_ponto');
    if (!sheet) return { success: false, message: 'Aba de registro não encontrada.' };
    const entrada = sheet.getRange(rowIndex, 5).getValue();
    const saidaInt = sheet.getRange(rowIndex, 6).getValue();
    const retornoInt = sheet.getRange(rowIndex, 7).getValue();
    const saida = sheet.getRange(rowIndex, 8).getValue();
    const entradaStr = formatTimeForDisplay(entrada);
    const saidaIntStr = formatTimeForDisplay(saidaInt);
    const retornoIntStr = formatTimeForDisplay(retornoInt);
    const saidaStr = formatTimeForDisplay(saida);
    const totalHoras = calculateTotalHours(entradaStr, saidaIntStr, retornoIntStr, saidaStr);
    if (totalHoras) {
      sheet.getRange(rowIndex, 9).setValue(totalHoras);
    }
    return { success: true, totalHoras: totalHoras };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function onEdit(e) {
  try {
    if (!e) return;
    const sheet = e.source.getActiveSheet();
    if (sheet.getSheetName() !== 'registro_ponto') return;
    const row = e.range.getRow();
    const col = e.range.getColumn();
    if (col >= 5 && col <= 8 && row > 1) {
      recalcularTotalHoras(row);
    }
  } catch (e) {
    Logger.log('ERRO onEdit: ' + e.toString());
  }
}

// ============================================================
// EDIÇÃO DE REGISTROS PELO ADMIN (SOMENTE PELO SISTEMA)
// ============================================================

function normalizarHora(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor).trim();
  if (!texto) return '';
  const match = texto.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const horas = parseInt(match[1], 10);
  const minutos = parseInt(match[2], 10);
  const segundos = parseInt(match[3] || '0', 10);
  if (horas > 23 || minutos > 59 || segundos > 59) return null;
  return String(horas).padStart(2, '0') + ':' +
    String(minutos).padStart(2, '0') + ':' +
    String(segundos).padStart(2, '0');
}

function atualizarRegistro(idRegistro, entrada, saidaIntervalo, retornoIntervalo, saida, motivo) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('registro_ponto');
    if (!sheet) return { success: false, message: 'Aba de registro não encontrada.' };

    const dados = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < dados.length; i++) {
      if (String(dados[i][0]) === String(idRegistro)) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex < 0) return { success: false, message: 'Registro não encontrado.' };

    const horarios = {
      entrada: normalizarHora(entrada),
      saidaIntervalo: normalizarHora(saidaIntervalo),
      retornoIntervalo: normalizarHora(retornoIntervalo),
      saida: normalizarHora(saida)
    };
    if (Object.keys(horarios).some(k => horarios[k] === null)) {
      return { success: false, message: 'Horário inválido. Use o formato HH:mm ou HH:mm:ss.' };
    }

    const e = horarios.entrada;
    const si = horarios.saidaIntervalo;
    const ri = horarios.retornoIntervalo;
    const s = horarios.saida;

    if (!e && (si || ri || s)) {
      return { success: false, message: 'Informe a entrada antes dos demais horários.' };
    }
    if ((si && !ri) || (!si && ri)) {
      return { success: false, message: 'Informe a saída e o retorno do intervalo juntos.' };
    }

    const mEntrada = e ? timeToMinutes(parseTime(e)) : null;
    const mSaidaIntervalo = si ? timeToMinutes(parseTime(si)) : null;
    const mRetornoIntervalo = ri ? timeToMinutes(parseTime(ri)) : null;
    const mSaida = s ? timeToMinutes(parseTime(s)) : null;

    if (mEntrada !== null && mSaidaIntervalo !== null && mSaidaIntervalo <= mEntrada) {
      return { success: false, message: 'A saída do intervalo deve ser depois da entrada.' };
    }
    if (mSaidaIntervalo !== null && mRetornoIntervalo !== null && mRetornoIntervalo <= mSaidaIntervalo) {
      return { success: false, message: 'O retorno do intervalo deve ser depois da saída do intervalo.' };
    }
    if (mRetornoIntervalo !== null && mSaida !== null && mSaida <= mRetornoIntervalo) {
      return { success: false, message: 'A saída deve ser depois do retorno do intervalo.' };
    }
    if (mEntrada !== null && mSaida !== null && mSaida <= mEntrada) {
      return { success: false, message: 'A saída deve ser depois da entrada.' };
    }

    const totalHoras = calculateTotalHours(e, si, ri, s);
    if (s && !totalHoras) {
      return {
        success: false,
        message: 'Horários inconsistentes: a saída deve ser depois da entrada e o intervalo deve ser válido.'
      };
    }

    sheet.getRange(rowIndex, 5, 1, 4).setValues([[e, si, ri, s]]);
    sheet.getRange(rowIndex, 9).setValue(totalHoras || '');

    const textoMotivo = String(motivo || '').trim();
    if (textoMotivo) {
      const agora = Utilities.formatDate(new Date(), TIMEZONE, 'dd/MM/yyyy HH:mm');
      const obsAtual = String(sheet.getRange(rowIndex, 11).getValue() || '').trim();
      const registro = '[' + agora + '] ' + textoMotivo;
      sheet.getRange(rowIndex, 11).setValue(obsAtual ? obsAtual + ' | ' + registro : registro);
    }

    return {
      success: true,
      message: 'Registro atualizado com sucesso.',
      totalHoras: totalHoras,
      record: { entrada: e, saidaIntervalo: si, retornoIntervalo: ri, saida: s }
    };
  } catch (error) {
    Logger.log('ERRO atualizarRegistro: ' + error.toString());
    return { success: false, message: 'Erro ao atualizar registro: ' + error.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// ============================================================
// BANCO DE HORAS
// ============================================================

function calcularBancoHoras(employeeId, mes, ano) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const regSheet = ss.getSheetByName('registro_ponto');
    if (!regSheet) return { bancoHoras: 0, totalHorasTrabalhadas: 0, cargaPrevista: 0 };
    const escala = getEscalaFuncionario(employeeId);
    const cargaDiaria = escala.cargaDiaria || 8;
    const dados = regSheet.getDataRange().getValues();
    let totalHorasTrabalhadas = 0;
    let diasTrabalhados = 0;
    for (let i = 1; i < dados.length; i++) {
      const r = dados[i];
      if (String(r[1]) !== String(employeeId)) continue;
      const dStr = formatDateBR(r[3]);
      if (!dStr) continue;
      const partes = dStr.split('/');
      const dia = parseInt(partes[0], 10);
      const mesRegistro = parseInt(partes[1], 10);
      const anoRegistro = parseInt(partes[2], 10);
      if (mesRegistro !== mes || anoRegistro !== ano) continue;
      if (r[8]) {
        const horas = String(r[8]).split(':').map(Number);
        const horasDec = horas[0] + horas[1] / 60;
        totalHorasTrabalhadas += horasDec;
        diasTrabalhados++;
      }
    }
    const cargaPrevista = diasTrabalhados * cargaDiaria;
    const bancoHoras = totalHorasTrabalhadas - cargaPrevista;
    return {
      bancoHoras: bancoHoras,
      totalHorasTrabalhadas: totalHorasTrabalhadas,
      cargaPrevista: cargaPrevista,
      diasTrabalhados: diasTrabalhados
    };
  } catch (e) {
    return { bancoHoras: 0, totalHorasTrabalhadas: 0, cargaPrevista: 0, diasTrabalhados: 0 };
  }
}

function getBancoHoras(employeeId) {
  try {
    const agora = new Date();
    const mes = agora.getMonth() + 1;
    const ano = agora.getFullYear();
    return calcularBancoHoras(employeeId, mes, ano);
  } catch (e) {
    return { bancoHoras: 0, totalHorasTrabalhadas: 0, cargaPrevista: 0, diasTrabalhados: 0 };
  }
}

function getBancoHorasTodos() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userSheet = ss.getSheetByName('usuario');
    if (!userSheet) return [];
    const dados = userSheet.getDataRange().getValues();
    const resultado = [];
    for (let i = 1; i < dados.length; i++) {
      const banco = getBancoHoras(dados[i][0]);
      resultado.push({
        id: dados[i][0],
        usuario: dados[i][1] || '',
        nome: dados[i][3] || dados[i][1] || '',
        bancoHoras: banco.bancoHoras,
        totalHorasTrabalhadas: banco.totalHorasTrabalhadas,
        cargaPrevista: banco.cargaPrevista
      });
    }
    return resultado;
  } catch (e) {
    return [];
  }
}

// ============================================================
// REGISTRO DE PONTO
// ============================================================
function getLatestEmployeeRecord(employeeId) {
  Logger.log('=== getLatestEmployeeRecord ===');
  Logger.log('Funcionário ID: ' + employeeId);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('registro_ponto');
    if (!sheet) { Logger.log('✗ Aba "registro_ponto" NÃO encontrada'); return null; }
    const records = sheet.getDataRange().getValues();
    if (records.length <= 1) { Logger.log('Aba vazia'); return null; }
    const today = Utilities.formatDate(new Date(), TIMEZONE, 'dd/MM/yyyy');
    for (let i = records.length - 1; i >= 1; i--) {
      const record = records[i];
      const recordDateStr = formatDateBR(record[3]);
      if (String(record[1]) === String(employeeId) && recordDateStr === today) {
        return {
          row: i + 1, idRegistro: record[0], idFuncionario: record[1], nomeFuncionario: record[2],
          data: recordDateStr, entrada: formatTimeForDisplay(record[4]),
          saidaIntervalo: formatTimeForDisplay(record[5]),
          retornoIntervalo: formatTimeForDisplay(record[6]),
          saida: formatTimeForDisplay(record[7]),
          totalHorasTrabalhadas: formatDurationForDisplay(record[8]),
          geolocalizacao: record[9], observacoes: String(record[10] || '')
        };
      }
    }
    return null;
  } catch (error) {
    Logger.log("✗ ERRO: " + error.toString());
    return null;
  }
}

function registerClockAction(employeeId, employeeName, actionType, geoLocation) {
  Logger.log('=== registerClockAction: ' + actionType + ' ===');
  const colMap = { entrada: 5, saida_intervalo: 6, retorno_intervalo: 7, saida: 8 };
  if (!colMap[actionType]) return { success: false, message: 'Ação inválida.' };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('registro_ponto');
    if (!sheet) return { success: false, message: 'Aba de registro não encontrada.' };
    const now = new Date();
    const formattedTime = Utilities.formatDate(now, TIMEZONE, 'HH:mm:ss');
    const formattedDate = Utilities.formatDate(now, TIMEZONE, 'dd/MM/yyyy');
    const isSaturday = Utilities.formatDate(now, TIMEZONE, 'u') === '6';
    if (isSaturday && (actionType === 'saida_intervalo' || actionType === 'retorno_intervalo')) {
      return { success: false, message: 'Sábado não permite intervalo. Apenas Entrada e Saída.' };
    }

    // Verificar se hoje é dia de folga para o funcionário
    const hoje = Utilities.formatDate(now, TIMEZONE, 'dd/MM/yyyy');
    const ehDiaFolga = isDiaFolga(employeeId, hoje);
    if (ehDiaFolga && actionType === 'entrada') {
      return { success: false, message: 'Hoje é dia de folga para este funcionário.' };
    }
    const latestRecord = getLatestEmployeeRecord(employeeId);
    let expectedAction = 'entrada';
    if (latestRecord) {
      if (latestRecord.saida) return { success: false, message: 'Jornada já finalizada.' };
      if (isSaturday) {
        expectedAction = latestRecord.entrada ? 'saida' : 'entrada';
      } else if (latestRecord.retornoIntervalo) {
        expectedAction = 'saida';
      } else if (latestRecord.saidaIntervalo) {
        expectedAction = 'retorno_intervalo';
      } else if (latestRecord.entrada) {
        expectedAction = 'saida_intervalo';
      }
    }
    if (actionType !== expectedAction) {
      return { success: false, message: 'Ação incorreta. Atualize a página.' };
    }
    let rowToUpdate;
    if (latestRecord) {
      rowToUpdate = latestRecord.row;
    } else {
      const allData = sheet.getDataRange().getValues();
      const maxId = allData.reduce((m, r) => Math.max(m, parseInt(r[0], 10) || 0), 0);
      sheet.appendRow([maxId + 1, employeeId, employeeName, formattedDate, null, null, null, null, null, geoLocation || '', '']);
      rowToUpdate = sheet.getLastRow();
    }
    const existingValue = sheet.getRange(rowToUpdate, colMap[actionType]).getValue();
    if (existingValue !== '' && existingValue !== null) {
      return { success: false, message: 'Horário já registrado.' };
    }
    sheet.getRange(rowToUpdate, colMap[actionType]).setValue(formattedTime);
    if (geoLocation) sheet.getRange(rowToUpdate, 10).setValue(geoLocation);
    const entrada = sheet.getRange(rowToUpdate, 5).getValue();
    const saidaInt = sheet.getRange(rowToUpdate, 6).getValue();
    const retornoInt = sheet.getRange(rowToUpdate, 7).getValue();
    const saida = sheet.getRange(rowToUpdate, 8).getValue();
    const totalHoras = calculateTotalHours(
      formatTimeForDisplay(entrada), formatTimeForDisplay(saidaInt),
      formatTimeForDisplay(retornoInt), formatTimeForDisplay(saida)
    );
    if (totalHoras) sheet.getRange(rowToUpdate, 9).setValue(totalHoras);
    return { success: true, message: 'Registrado às ' + formattedTime,
      record: {
        entrada: formatTimeForDisplay(sheet.getRange(rowToUpdate, 5).getValue()),
        saidaIntervalo: formatTimeForDisplay(sheet.getRange(rowToUpdate, 6).getValue()),
        retornoIntervalo: formatTimeForDisplay(sheet.getRange(rowToUpdate, 7).getValue()),
        saida: formatTimeForDisplay(sheet.getRange(rowToUpdate, 8).getValue()),
        totalHoras: totalHoras
      }
    };
  } catch (error) {
    Logger.log('✗ ERRO: ' + error.toString());
    return { success: false, message: 'Erro: ' + error.toString() };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// ============================================================
// DADOS PARA DASHBOARD E PÁGINAS
// ============================================================
function getWorkingEmployees() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('registro_ponto');
    const userSheet = ss.getSheetByName('usuario');
    if (!sheet || !userSheet) return [];
    const today = Utilities.formatDate(new Date(), TIMEZONE, 'dd/MM/yyyy');
    const records = sheet.getDataRange().getValues();
    const working = [];
    const ids = new Set();
    for (let i = 1; i < records.length; i++) {
      const r = records[i];
      const dStr = formatDateBR(r[3]);
      if (dStr === today && !ids.has(String(r[1]))) {
        ids.add(String(r[1]));
        working.push({
          id: r[1], nome: r[2],
          entrada: formatTimeForDisplay(r[4]),
          saida: formatTimeForDisplay(r[8]),
          status: r[4] && !r[8] ? 'Trabalhando' : 'Saiu'
        });
      }
    }
    return working;
  } catch (e) { return []; }
}

function getDashboardData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const regSheet = ss.getSheetByName('registro_ponto');
    const userSheet = ss.getSheetByName('usuario');
    if (!regSheet || !userSheet) {
      return { totalFunc: 0, presentes: 0, ausentes: 0, extrasHoje: '0h', extrasMes: '0h', diasComExtra: 0 };
    }
    const hoje = Utilities.formatDate(new Date(), TIMEZONE, 'dd/MM/yyyy');
    const mesAtual = Utilities.formatDate(new Date(), TIMEZONE, 'MM/yyyy');
    const users = userSheet.getDataRange().getValues();
    const totalFunc = users.length - 1;
    const records = regSheet.getDataRange().getValues();
    
    let presentes = 0, extrasHoje = 0;
    const diasExtra = {};
    
    for (let i = 1; i < records.length; i++) {
      const r = records[i];
      const dStr = formatDateBR(r[3]);
      if (!dStr) continue;
      const rMes = dStr.split('/').slice(1).join('/');
      const horas = r[8] ? String(r[8]).split(':').map(Number) : [0,0];
      const horasDec = horas[0] + horas[1]/60;
      
      if (dStr === hoje && r[4]) presentes++;
      if (horasDec > 8) {
        if (dStr === hoje) extrasHoje += (horasDec - 8);
        diasExtra[rMes + '-' + dStr] = (diasExtra[rMes + '-' + dStr] || 0) + (horasDec - 8);
      }
    }
    const extrasMes = Object.values(diasExtra).reduce((a,b) => a+b, 0);
    
    // Calcular carga horária prevista e banco de horas total
    let cargaHorariaPrevista = 0;
    let bancoHorasTotal = 0;
    for (let i = 1; i < users.length; i++) {
      const employeeId = users[i][0];
      const escala = getEscalaFuncionario(employeeId);
      const banco = calcularBancoHoras(employeeId, parseInt(mesAtual.split('/')[0], 10), new Date().getFullYear());
      cargaHorariaPrevista += escala.cargaDiaria || 8;
      bancoHorasTotal += banco.bancoHoras;
    }
    
    return {
      totalFunc, presentes, ausentes: totalFunc - presentes,
      extrasHoje: extrasHoje.toFixed(1) + 'h',
      extrasMes: extrasMes.toFixed(1) + 'h',
      diasComExtra: Object.keys(diasExtra).length,
      cargaHorariaPrevista: cargaHorariaPrevista.toFixed(1) + 'h',
      bancoHorasTotal: bancoHorasTotal.toFixed(1) + 'h'
    };
  } catch (e) {
    return { totalFunc: 0, presentes: 0, ausentes: 0, extrasHoje: '0h', extrasMes: '0h', diasComExtra: 0, cargaHorariaPrevista: '0h', bancoHorasTotal: '0h' };
  }
}

function getListaUsuarios() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('usuario');
    if (!sheet) return [];
    const dados = sheet.getDataRange().getValues();
    return dados.slice(1).map(row => ({
      id: row[0], usuario: row[1], nome: row[3] || row[1], email: row[4] || '', ativo: true
    }));
  } catch (e) { return []; }
}

function getRegistrosFiltrados(dataInicio, dataFim) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('registro_ponto');
    if (!sheet) return [];
    const dados = sheet.getDataRange().getValues();
    const inicio = dataInicio ? parseDateBR(dataInicio) : null;
    const fim = dataFim ? parseDateBR(dataFim) : null;
    if (inicio) inicio.setHours(0, 0, 0, 0);
    if (fim) fim.setHours(23, 59, 59, 999);
    const resultado = [];
    for (let i = dados.length - 1; i >= 1; i--) {
      const r = dados[i];
      const dataRegistro = parseDateBR(r[3]);
      if (!dataRegistro) continue;
      dataRegistro.setHours(0, 0, 0, 0);
      if ((!inicio || dataRegistro >= inicio) && (!fim || dataRegistro <= fim)) {
        resultado.push({
          id: r[0], idFunc: r[1], nome: r[2],
          data: Utilities.formatDate(dataRegistro, TIMEZONE, 'dd/MM/yyyy'),
          entrada: formatTimeForDisplay(r[4]), saidaIntervalo: formatTimeForDisplay(r[5]),
          retornoIntervalo: formatTimeForDisplay(r[6]), saida: formatTimeForDisplay(r[7]),
          totalHoras: formatDurationForDisplay(r[8])
        });
      }
    }
    return resultado;
  } catch (e) { return []; }
}

function salvarConfiguracoes(config) {
  PropertiesService.getScriptProperties().setProperty('configSistema', JSON.stringify(config));
  return { success: true };
}

function carregarConfiguracoes() {
  const padrao = { cargaHorariaDia: 8, permitirSabado: false, notificacoes: true };
  try {
    const salvas = PropertiesService.getScriptProperties().getProperty('configSistema');
    return salvas ? Object.assign(padrao, JSON.parse(salvas)) : padrao;
  } catch { return padrao; }
}