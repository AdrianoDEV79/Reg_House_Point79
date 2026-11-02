# 🏗️ Arquitetura

Documento técnico sobre como as peças do sistema se conectam, os fluxos principais e as decisões por trás do código atual.

---

## Visão em camadas

```mermaid
flowchart LR
    subgraph Cliente["Navegador (cliente)"]
        HTML["Páginas HTML<br/>CSS + JS inline"]
        SS["sessionStorage<br/>usuarioLogado"]
    end

    subgraph AppsScript["Google Apps Script (servidor)"]
        DOGET["doGet(e)<br/>roteamento"]
        FUNCS["Funções globais<br/>utils.js"]
        PROPS["PropertiesService<br/>configSistema"]
    end

    subgraph Google["Google Workspace"]
        SHEETS[("Google Sheets<br/>registro_ponto · admin · usuario · config_escala")]
        TRIGGER["Trigger onEdit"]
    end

    HTML -->|"google.script.run"| FUNCS
    HTML --- SS
    DOGET --> HTML
    FUNCS --> SHEETS
    FUNCS --> PROPS
    SHEETS -->|"edição manual"| TRIGGER
    TRIGGER --> FUNCS
```

**Características:**

- Não há servidor próprio, banco relacional nem API REST.
- O "backend" é um conjunto de funções globais expostas automaticamente ao `google.script.run`.
- Toda a persistência é a planilha vinculada.
- Cada página é autocontida: CSS e JS ficam no próprio HTML, sem bundler.

---

## Fluxo de navegação

```mermaid
flowchart TD
    A["/exec"] --> B{"?page="}
    B -->|"geral"| C["admin.html"]
    B -->|"equipe"| D["Equipe.html"]
    B -->|"registros"| E["Registros.html"]
    B -->|"ajustes"| F["Ajustes.html"]
    B -->|"regPonto"| G["employee.html"]
    B -->|"ausente / login"| H["login.html"]

    H -->|"processLogin OK"| G
    C <-->|"bottom-nav"| D
    D <-->|"bottom-nav"| E
    E <-->|"bottom-nav"| F
    F <-->|"bottom-nav"| C
```

- O admin navega entre dashboard, equipe, registros e ajustes pela barra inferior.
- O funcionário fica em `employee.html`; ao sair, remove a sessão e volta ao login.
- As páginas admin **não verificam credencial no carregamento** — quem souber a URL acessa a interface (ver [Segurança](#segurança)).

---

## Fluxo de login

```mermaid
sequenceDiagram
    actor U as Usuário
    participant L as login.html
    participant S as processLogin
    participant P as Planilha

    U->>L: informa usuário e senha
    L->>S: google.script.run.processLogin(username, password)
    S->>P: lê aba admin
    P-->>S: linhas
    alt credencial de admin
        S-->>L: { success, role: 'admin', name }
    else não encontrou
        S->>P: lê aba usuario
        P-->>S: linhas
        alt credencial de funcionário
            S-->>L: { success, role: 'usuario', userId, userName }
        else inválida
            S-->>L: { success: false, message }
        end
    end
    alt sucesso
        L->>L: sessionStorage.setItem('usuarioLogado', JSON)
        L->>U: redireciona para ?page=regPonto
    else falha
        L->>U: exibe mensagem de erro
    end
```

**Observações:**

- Admin é verificado primeiro; se as credenciais baterem, o retorno é `role: 'admin'`.
- Não há expiração de sessão nem logout no servidor.
- O redirecionamento é sempre para `?page=regPonto`, inclusive para admin (o admin volta ao dashboard pela URL `?page=geral`).

---

## Fluxo de registro de ponto

```mermaid
sequenceDiagram
    actor F as Funcionário
    participant E as employee.html
    participant G as getLatestEmployeeRecord
    participant R as registerClockAction
    participant P as Planilha

    F->>E: abre a página
    E->>E: valida sessionStorage
    E->>E: solicita geolocalização (navigator.geolocation)
    E->>G: google.script.run.getLatestEmployeeRecord(id)
    G->>P: lê registro_ponto
    P-->>G: registros
    G-->>E: registro do dia ou null
    E->>E: calcula próxima ação e estado do botão

    F->>E: clica no botão
    E->>R: registerClockAction(id, nome, ação, geo)
    R->>R: LockService.waitLock(10000)
    R->>P: valida sábado / folga / sequência
    R->>P: cria ou atualiza linha do dia
    R->>P: grava horário e geolocalização
    R->>P: recalcula totalHoras
    R-->>E: { success, message, record }
    E->>E: exibe mensagem
    E->>G: recarrega registro do dia
    G-->>E: estado atualizado
    E->>E: atualiza botão e horários
```

### Máquina de estados da jornada

```mermaid
stateDiagram-v2
    [*] --> SemRegistro
    SemRegistro --> EmJornada: entrada
    EmJornada --> EmIntervalo: saida_intervalo
    EmIntervalo --> EmJornada: retorno_intervalo
    EmJornada --> Finalizada: saida
    Finalizada --> [*]

    SemRegistro --> SemRegistro: sábado (entrada/saída)
```

No sábado, o fluxo é simplificado: `entrada → saida`, sem passar por intervalo.

---

## Modelo de dados

```mermaid
erDiagram
    USUARIO ||--o{ REGISTRO_PONTO : "idFuncionario"
    USUARIO ||--o| CONFIG_ESCALA : "idFuncionario"
    ADMIN {
        int id
        string username
        string password
        string nome
    }
    USUARIO {
        int id PK
        string username
        string password
        string nome
        string email
    }
    REGISTRO_PONTO {
        int idRegistro PK
        int idFuncionario FK
        string nome
        string data
        string entrada
        string saidaIntervalo
        string retornoIntervalo
        string saida
        string totalHoras
        string geolocalizacao
        string observacoes
    }
    CONFIG_ESCALA {
        int idFuncionario PK
        string tipoEscala
        string folgas
        float cargaDiaria
        float cargaSabado
    }
```

Detalhes de colunas em [PLANILHA.md](PLANILHA.md).

---

## Decisões técnicas e trade-offs

| Decisão | Motivo provável | Consequência |
|---|---|---|
| **Sheets como banco** | Zero infraestrutura, edição manual fácil | Sem transações, leitura completa da aba, limites de tamanho |
| **HTML autocontido** | Simplicidade de deploy no Apps Script | CSS/JS duplicados entre páginas |
| **Login na planilha** | Simples de operar | Senhas em texto plano, sem auditoria |
| **`sessionStorage`** | Não depende de cookies/SSO | Sessão só no cliente; não protege o backend |
| **`LockService` só no ponto** | Evitar duplicidade no caso crítico | Escritas de escala/config podem competir |
| **Cálculo sob demanda** | Sem jobs/planilhas auxiliares | Dashboard percorre todos os registros a cada carregamento |
| **Trigger `onEdit`** | Manter `totalHoras` correto em edições manuais | Depende de configuração manual no projeto |
| **Banco de horas simplificado** | Entregar visão rápida sem folha de pagamento | Não considera faltas, feriados e sábado |

---

## Concorrência

- `registerClockAction` adquire `ScriptLock` com timeout de 10s; se não conseguir, lança erro tratado no `catch`.
- O lock cobre leitura do último registro, criação/atualização da linha e recálculo.
- `salvarEscalaFuncionario`, `salvarConfiguracoes` e `recalcularTotalHoras` **não** usam lock.
- `onEdit` roda no contexto da edição; edições em massa podem gerar várias execuções.

---

## Tratamento de erros

- Funções chamadas pelo frontend capturam exceções e retornam `{ success: false, message }`.
- Funções de leitura retornam estruturas vazias (`[]`, `null`, objeto padrão) em vez de lançar.
- `Logger.log` é usado extensivamente; os logs aparecem em **Apps Script → Execuções**.
- O frontend usa `withSuccessHandler` e, em geral, `withFailureHandler` apenas em `registerClockAction` e `processLogin`.

---

## Evolução: escala 5x2 e banco de horas

A versão 2.0 adicionou:

1. **Aba `config_escala`** — configuração por funcionário.
2. **`isDiaFolga`** — verificação usada no registro e na UI.
3. **`onEdit` + `recalcularTotalHoras`** — consistência do total após edição manual.
4. **`calcularBancoHoras` / `getBancoHoras` / `getBancoHorasTodos`** — visão mensal.
5. **Campos no dashboard** — `cargaHorariaPrevista` e `bancoHorasTotal` (backend pronto; frontend ainda não consome).
6. **Seção de escala em Ajustes** — cadastro via formulário.

### Pontos de atenção da implementação

- `isDiaFolga` usa `new Date('dd/MM/yyyy')`, que o V8 interpreta como `mm/dd/yyyy`.
- `cargaHorariaPrevista` no dashboard soma a carga diária uma vez por funcionário.
- O banco de horas usa dias trabalhados como base de carga prevista.
- A tela de Ajustes não recarrega a escala já salva ao trocar o funcionário.

Correções sugeridas estão no [README](../README.md#pendências-e-roadmap).

---

## Segurança

O modelo atual assume **ambiente interno e confiável**:

- `access: ANYONE` no manifesto.
- Sem validação de sessão no `doGet`.
- Sem verificação de `role` nas funções de admin.
- Senhas em texto plano.
- Geolocalização sem validação de perímetro.

Para endurecer, seria necessário:

1. Hash de senha (ex.: `Utilities.computeDigest` com salt) ou integração com Google Identity.
2. Token de sessão assinado com validade, validado em cada função.
3. Checagem de perfil nas funções administrativas.
4. Restringir o acesso do Web App (`access: DOMAIN` ou `MYSELF`).

---

## Documentos relacionados

- [README](../README.md) — visão geral e operação.
- [PLANILHA](PLANILHA.md) — estrutura das abas.
- [FUNCOES](FUNCOES.md) — referência do backend.
- [CHANGELOG](../CHANGELOG.md) — histórico.
