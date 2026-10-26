// ============================================================
// SISTEMA DE CONTROLE DE PONTO - GOOGLE APPS SCRIPT
// VERSÃO COMPLETA — com todas as páginas
// ============================================================

const TIMEZONE = "America/Sao_Paulo";

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
      let recordDateStr = '';
      try {
        if (record[3] instanceof Date) {
          recordDateStr = Utilities.formatDate(record[3], TIMEZONE, 'dd/MM/yyyy');
        } else {
          const d = new Date(String(record[3]));
          if (!isNaN(d.getTime())) recordDateStr = Utilities.formatDate(d, TIMEZONE, 'dd/MM/yyyy');
        }
      } catch (e) {}
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
      let dStr = '';
      try {
        dStr = r[3] instanceof Date ? Utilities.formatDate(r[3], TIMEZONE, 'dd/MM/yyyy')
          : Utilities.formatDate(new Date(String(r[3])), TIMEZONE, 'dd/MM/yyyy');
      } catch (e) {}
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
      let dStr = '';
      try {
        dStr = r[3] instanceof Date ? Utilities.formatDate(r[3], TIMEZONE, 'dd/MM/yyyy')
          : Utilities.formatDate(new Date(String(r[3])), TIMEZONE, 'dd/MM/yyyy');
      } catch (e) {}
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
    return {
      totalFunc, presentes, ausentes: totalFunc - presentes,
      extrasHoje: extrasHoje.toFixed(1) + 'h',
      extrasMes: extrasMes.toFixed(1) + 'h',
      diasComExtra: Object.keys(diasExtra).length
    };
  } catch (e) {
    return { totalFunc: 0, presentes: 0, ausentes: 0, extrasHoje: '0h', extrasMes: '0h', diasComExtra: 0 };
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
    const resultado = [];
    for (let i = dados.length - 1; i >= 1; i--) {
      const r = dados[i];
      let dStr = '';
      try {
        dStr = r[3] instanceof Date ? Utilities.formatDate(r[3], TIMEZONE, 'dd/MM/yyyy')
          : Utilities.formatDate(new Date(String(r[3])), TIMEZONE, 'dd/MM/yyyy');
      } catch (e) {}
      if (!dStr) continue;
      if ((!dataInicio || dStr >= dataInicio) && (!dataFim || dStr <= dataFim)) {
        resultado.push({
          id: r[0], idFunc: r[1], nome: r[2], data: dStr,
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