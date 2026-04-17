# Manual de Deploy - Sistema de Cobrança 🚀

Este guia contém as instruções necessárias para subir o sistema na Virtual Machine (VM) de Produção.

## Pré-requisitos da Máquina Virtual (VM)
1. **Node.js**: Versão 20.x ou superior instalada (`node -v`).
2. **PostgreSQL**: Servidor de banco de dados instalado e rodando. Não é necessário carregar as tabelas/esquemas manualmente, a própria aplicação faz as migrações na primeira vez que rodar.

## Passo a Passo para Inicialização

### 1. Instalação das Dependências
Abra o terminal na pasta raiz do projeto e execute:
```bash
npm install
```

### 2. Configuração do Banco e Chaves de Integração (Arquivo .env)
Renomeie o arquivo `.env.example` para `.env` (ou utilize o arquivo `.env` enviado em anexo) e atualize a variável de conexão com o banco de produção:

```env
DATABASE_URL=postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/SUA_DATABASE
```
> **Nota:** Certifique-se de que o banco de dados especificado na URL já esteja criado (o comando equivalente seria `CREATE DATABASE "nomedobanco";`). O resto das tabelas (`users`, `titulos`, `logs`, etc.) geraremos no passo 4.

Verifique também se os acessos ao Omie (`APP_KEY` e `APP_SECRET`), SMTP do E-mail, e API do WhatsApp (Evolution API) estão corretos para o ambiente de Produção.

### 3. Build do Front-end
Para transformar os arquivos `.tsx` do React em recursos estáticos hiper-otimizados:
```bash
npm run build
```
*(Isso criará uma pasta chamada `dist` no projeto. O nosso servidor encarregará de usar esses arquivos automaticamente se estivermos em modo produção).*

### 4. Executando o Sistema (Produção)
Para iniciar definitivamente a aplicação para os usuários utilizarem (API e Front-end ao mesmo tempo):

```bash
# Executa o sistema indicando que está em ambiente de Produção
NODE_ENV=production npm start
```
> O comando `npm start` já executa o script do `tsx server.ts`. O modo production garante que nenhuma alteração via Vite seja injetada no código rodando.

### Testando
O servidor assumirá a **Porta 3000** por padrão. Confirme a saúde da aplicação testando no navegador ou enviando um ping via cURL (Ex: `http://ip-da-vm:3000/api/health`).

---

**Dica de Manutenção:** Para deixar a aplicação online 100% do tempo sem morrer quando o terminal for fechado, recomendo instalar o [PM2](https://pm2.keymetrics.io/):
```bash
npm install -g pm2
pm2 start "NODE_ENV=production npm start" --name "sistema-cobranca"
```
