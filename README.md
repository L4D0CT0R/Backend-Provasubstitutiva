# Backend para Monitoramento de Sensores

Este é o backend de um sistema de monitoramento de sensores, desenvolvido utilizando **Node.js**, **Express**, **SQLite3**, **Socket.IO**, **JWT** para autenticação e **bcrypt** para criptografia de senhas.

## Tecnologias

- **Node.js**: Ambiente de execução para JavaScript no servidor.
- **Express**: Framework para facilitar a criação de APIs REST.
- **SQLite3**: Banco de dados leve para armazenamento local.
- **Socket.IO**: Comunicação em tempo real entre o servidor e os clientes.
- **JWT**: Autenticação via JSON Web Token.
- **bcrypt**: Criptografia de senhas.

## Funcionalidades

- **Cadastro de Usuário**: Permite o registro de novos usuários com criptografia de senha.
- **Login**: Autenticação de usuários utilizando JWT.
- **Monitoramento de Sensores**: Emissão de dados de sensores de temperatura e umidade em tempo real via WebSocket.
- **Armazenamento de Dados**: Dados de sensores (temperatura e umidade) são armazenados em um banco SQLite.
- **Rotas Protegidas por JWT**: Acesso a dados sensíveis (como dados dos sensores) é protegido por autenticação JWT.
- **Limpeza de Dados**: Função para limpar todos os dados da tabela de sensores.

## Instalação

Para rodar este backend, siga os seguintes passos:

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/username/repo-name.git
   cd repo-name

2. **instalando dependência**:
    npm install

3. **iniciando servidor**:
    node server.js