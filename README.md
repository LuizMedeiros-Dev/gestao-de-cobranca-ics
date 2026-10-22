# Sistema de Cobrança e Gestão de Recebíveis 🚀

Sistema completo para automação de réguas de cobrança, gestão de contas a receber e integração contínua com ERP Omie, notificações via E-mail (SMTP) e WhatsApp.

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:
* **[Node.js](https://nodejs.org/)** (versão 20.x ou superior)
* **[PostgreSQL](https://www.postgresql.org/)** (versão 14 ou superior instalado localmente, via Docker ou em nuvem)

---

## 🛠️ Passo a Passo para Execução Local

### 1. Clonar e Instalar as Dependências
No terminal, na pasta raiz do projeto, execute:
```bash
npm install
```

---

### 2. Configurar o Banco de Dados Local (PostgreSQL)

> 💡 **Importante:** Você **NÃO precisa de nenhum dump** ou arquivo `.sql` prévio para subir a base! O sistema possui um mecanismo de **Auto-Migração (Auto-DDL)** que cria e atualiza todas as tabelas e relacionamentos automaticamente no momento em que a aplicação é iniciada.

1. Abra seu cliente de banco de dados preferido (pgAdmin, DBeaver ou terminal `psql`).
2. Crie apenas um **banco de dados vazio**:
   ```sql
   CREATE DATABASE cobranca;
   ```
*(Substitua `cobranca` pelo nome de banco que preferir).*

---

### 3. Configurar as Variáveis de Ambiente (`.env`)

Copie o arquivo de exemplo [.env.example](file:///.env.example) para criar o seu arquivo `.env`:

* **No Windows (PowerShell):**
  ```powershell
  Copy-Item .env.example .env
  ```
* **No Linux/Mac:**
  ```bash
  cp .env.example .env
  ```

Abra o arquivo `.env` gerado e configure sua string de conexão com o PostgreSQL:
```env
# Formato: postgresql://<usuario>:<senha>@<host>:<porta>/<nome_do_banco>
DATABASE_URL=postgresql://postgres:suasenha@localhost:5432/cobranca
```

*(Opcional)* Caso vá testar a sincronização real com o Omie, preencha as chaves da(s) empresa(s) correspondente(s):
```env
ICS_OMIE_APP_KEY=sua_app_key
ICS_OMIE_APP_SECRET=seu_app_secret
```

---

### 4. Rodar a Aplicação

#### Em Modo de Desenvolvimento:
```bash
npm run dev
```
O servidor Express iniciará na porta **3000** junto com o Vite integrado. Acesse no navegador:
👉 **http://localhost:3000**

*(No primeiro boot, você verá os logs no terminal confirmando a criação das tabelas no banco de dados automaticamente).*

---

### 5. Primeiro Acesso / Criar Usuário Administrador

Para gerar as credenciais de acesso do administrador no banco recém-criado, execute no terminal:
```bash
npm run seed
```

Este comando criará (ou atualizará) o usuário administrativo:
* **E-mail:** `admin@admin.com`
* **Senha:** `Admin@123`

*(Você também pode alterar ou cadastrar novos usuários acessando o menu **Usuários / Configurações** no painel).*

---

## 📦 Scripts Disponíveis

* `npm run dev`: Inicia o servidor local integrado (API + Frontend Vite HMR).
* `npm run seed`: Cria ou reseta o usuário administrador padrão (`admin@admin.com`).
* `npm run build`: Compila o front-end React gerando os arquivos estáticos otimizados na pasta `dist/`.
* `npm start`: Inicia o servidor em modo produção utilizando os arquivos compilados da pasta `dist/`.

---

## 📖 Instruções de Produção / Deploy em VM

Para instruções detalhadas de publicação do sistema em uma máquina virtual (Linux/Ubuntu), configuração de serviço contínuo com PM2 e variáveis em nuvem, consulte o documento:
* 📄 [Manual de Deploy em Produção](doc/INSTRUCOES_DE_PRODUCAO.md)
