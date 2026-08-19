# Autoconf Vehicles Web

Frontend do sistema Autoconf para gerenciamento de veículos e usuários. A aplicação consome a API do Autoconf Vehicles, possui autenticação por Bearer Token e diferencia funcionalidades disponíveis para usuários comuns e administradores.

## Funcionalidades

- Autenticação e encerramento de sessão.
- Fluxo obrigatório de criação de senha no primeiro acesso.
- Listagem, busca e ordenação de veículos.
- Cadastro, visualização, edição e exclusão de veículos.
- Upload, remoção e definição da imagem de capa do veículo.
- Listagem, criação e exclusão de usuários por administradores.
- Proteção de rotas autenticadas e administrativas.
- Redirecionamento para o login quando a API retornar `401 Unauthorized`.

## Tecnologias

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- Oxlint

## Requisitos

- Node.js `^20.19.0` ou `>=22.12.0`, conforme exigido pelo Vite.
- npm.
- Backend Autoconf Vehicles em execução e acessível pelo navegador.

O backend deve estar configurado para:

- aceitar requisições CORS vindas da URL do frontend;
- servir os arquivos públicos de veículos pela rota `/storage`;
- disponibilizar os endpoints da API sob o prefixo `/api`.

## Configuração

Crie o arquivo `.env` na raiz do projeto. É possível copiar o exemplo existente:

```bash
cp .env.example .env
```

Configure a URL base do backend, sem `/api` no final:

```env
VITE_BACKEND_URL=http://localhost:8000
```

Exemplos:

```env
# Desenvolvimento local
VITE_BACKEND_URL=http://localhost:8000

# Ambiente publicado
VITE_BACKEND_URL=https://api.exemplo.com
```

Variáveis iniciadas com `VITE_` são incorporadas ao bundle durante o build. Portanto, alterações no `.env` exigem um novo build da aplicação.

## Instalação e execução

Instale as dependências usando o lockfile do projeto:

```bash
npm ci
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Por padrão, o Vite disponibiliza a aplicação em `http://localhost:5173`.

## Scripts disponíveis

```bash
# Servidor de desenvolvimento com atualização automática
npm run dev

# Verificação TypeScript e build de produção
npm run build

# Análise estática do código
npm run lint

# Pré-visualização local do build
npm run preview
```

O resultado do build é gerado no diretório `dist/`.

## Rotas da aplicação

| Rota | Acesso | Descrição |
| --- | --- | --- |
| `/login` | Público | Autenticação do usuário |
| `/first-access` | Primeiro acesso | Criação obrigatória da senha |
| `/vehicles` | Autenticado | Listagem de veículos |
| `/vehicles/create` | Autenticado | Cadastro de veículo |
| `/vehicles/:vehicleId` | Autenticado | Detalhes do veículo |
| `/vehicles/:vehicleId/edit` | Autenticado | Edição do veículo |
| `/users` | Administrador | Listagem de usuários |
| `/users/create` | Administrador | Cadastro de usuário |

As restrições no frontend melhoram a navegação, mas o backend também deve validar autenticação, propriedade dos recursos e permissões administrativas.

## Autenticação e primeiro acesso

O login envia o e-mail e, quando informada, a senha para `POST /api/auth/login`. O token retornado e os dados do usuário são armazenados no `localStorage`.

Quando a API retorna `first_login: true`, o usuário fica restrito à rota `/first-access`. Nessa tela, uma senha com no mínimo oito caracteres é enviada para `POST /api/auth/password`. Somente após a API confirmar `first_login: false` as demais rotas são liberadas.

Qualquer resposta `401 Unauthorized` remove os dados locais da sessão e redireciona o navegador para `/login`.

## Publicação

Publique o conteúdo de `dist/` em um servidor de arquivos estáticos. Como a navegação usa rotas no navegador, o servidor deve encaminhar rotas desconhecidas para `index.html`.

Sem esse fallback, acessar diretamente uma URL como `/vehicles/1` ou atualizar a página nessa rota poderá resultar em erro `404` do servidor de hospedagem.

Antes de publicar, gere o build com a URL correta da API:

```bash
npm run build
```

Depois, valide o resultado localmente:

```bash
npm run preview
```
