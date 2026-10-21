# ⚡ VoltHub Mobile & Web — Multiplatform App

Aplicação multiplataforma (**Android, iOS e Web**) construída com **React Native (Expo SDK 57) + TypeScript** para consumir o ecossistema de recarga de veículos elétricos **VoltHub**, seguindo rigorosamente **Domain-Driven Design (DDD)** e **Clean Architecture**.

---

## 🏗️ Arquitetura (DDD + Clean Architecture)

O código em `src/` é dividido em 4 camadas concêntricas, respeitando a **Regra de Dependência** (camadas internas não conhecem camadas externas nem frameworks de UI):

```text
apps/mobile/src/
├── core/                  # Utilitários transversais (Result<T, E>, AppError, variáveis de ambiente)
├── domain/                # Camada de Domínio Puro (0 dependências de React/Expo)
│   ├── entities/          # Entidades ricas: Station, Charger, User
│   ├── value-objects/     # Objetos de Valor com invariantes: Coordinates (Haversine), Money, ConnectorType, ChargerStatus
│   └── repositories/      # Ports (Contratos/Interfaces): IStationRepository, IFavoritesRepository, IAuthRepository
├── application/           # Casos de Uso (Application Business Rules)
│   └── use-cases/         # GetStationsUseCase, GetStationByIdUseCase, FilterStationsUseCase, ToggleFavoriteStationUseCase, LoginUseCase
├── infrastructure/        # Adapters de Saída (Implementações concretas de API HTTP, Mappers, Storage)
│   ├── api/               # apiClient (fetch + timeout), DTOs e FallbackStationsSeed (resiliência offline)
│   ├── mappers/           # StationMapper (DTO <-> Domain Entity)
│   ├── repositories/      # HttpStationRepository, LocalStorageFavoritesRepository, HttpAuthRepository
│   └── storage/           # Persistência universal (@react-native-async-storage/async-storage -> SQLite/AsyncStorage no Mobile e localStorage na Web)
├── presentation/          # Camada de Apresentação e UI
│   ├── theme/             # Design System Dark Neon (colors, spacing, radii)
│   ├── state/             # Stores Zustand (useStationsStore, useFavoritesStore, useLiveChargingStore, useAuthStore)
│   └── components/        # Componentes visuais (InteractiveMap, StationCard, ChargerRow, LiveChargingGauge, SearchBar, FilterChips)
└── app/                   # Rotas Expo Router (File-based routing)
    ├── _layout.tsx        # Navegação em Abas (Mapa, Estações, Recarga Ao Vivo, Favoritos)
    ├── index.tsx          # Mapa Interativo de Belo Horizonte com Bottom Card
    ├── stations/
    │   ├── index.tsx      # Lista de Eletropostos com Busca e Filtros
    │   └── [id].tsx       # Detalhes da Estação, Comodidades e Conectores
    ├── live.tsx           # Telemetria de Recarga em Tempo Real (WebSocket + Medidor Circular)
    └── favorites.tsx      # Eletropostos Favoritos Persistidos Localmente
```

---

## ✅ As 5 Features da Disciplina + Bônus VoltHub

| # | Feature | Implementação no VoltHub Mobile |
|---|---|---|
| **1** | **Lista consumindo API real** | `HttpStationRepository` consome `GET /api/v1/stations` do `bff-web` (com fallback resiliente para as 10 estações de BH caso o Docker esteja desligado) |
| **2** | **Navegação lista → detalhe** | Toque em qualquer `StationCard` ou pin do mapa navega para `/stations/[id]`, exibindo foto, avaliação, horário, comodidades e lista de conectores (`ChargerRow`) |
| **3** | **Busca por texto** | `SearchBar` filtra instantaneamente por nome do posto, endereço/bairro ou comodidade via `Station.matchesSearch()` |
| **4** | **Categoria/filtro estruturado** | `FilterChips` filtra por *Vagas Livres*, *Rápido (>50kW)*, *Plug CCS 2* e *Plug Tipo 2* combinando query params reais na API (`?status=AVAILABLE`, `?fastOnly=true`, `?connector=CCS2`) e `FilterStationsUseCase` |
| **5** | **Favoritos persistidos localmente** | `LocalStorageFavoritesRepository` persiste o `Set` de IDs favoritos via `AsyncStorage` / `localStorage`, sobrevivendo ao fechamento do app |
| **★** | **Mapa + Telemetria Ao Vivo** | Aba **Mapa** com pins georreferenciados e aba **Recarga** com medidor circular em tempo real (conectado ao `POST /api/v1/reservations` e WebSocket `/ws` do BFF) |

---

## 🚀 Como Executar

### 1. Instalar dependências
```bash
npm install --prefix apps/mobile
```

### 2. Rodar na Web (Navegador)
```bash
npm run web --prefix apps/mobile
```

### 3. Rodar no Android / iOS
```bash
npm run android --prefix apps/mobile
# ou
npm run ios --prefix apps/mobile
```

### 4. Rodar Testes de Domínio e Typecheck
```bash
npm test --prefix apps/mobile
npm run lint --prefix apps/mobile
```

### 5. Testes E2E (Maestro) — Projeto Final

Os 5 flows em [`flows/`](./flows) cobrem as 5 features e usam a convenção de `testID` da disciplina
(`item-list-screen`, `item-card-<id>`, `search-input`, `category-chip-<filtro>`, `detail-screen`,
`detail-title`, `detail-favorite-button`, `detail-back-button`, `tab-favorites`, `favorite-item-<id>`).
Eles rodam contra o seed local (sem BFF), então funcionam também no CI.

```bash
npx expo run:android      # com emulador aberto
maestro test flows/       # instalar: https://docs.maestro.dev/getting-started/installing-maestro
```

| Flow | Feature |
|---|---|
| `01-list` | Lista consumindo API (ou seed) |
| `02-detail-navigation` | Lista → detalhe |
| `03-search` | Busca por texto |
| `04-category-filter` | Chip "Vagas Livres" (`?status=AVAILABLE`) |
| `05-favorites` | Favoritar, ver na aba e persistir |
