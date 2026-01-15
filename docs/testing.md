# Guide des Tests - Whispr Messenger

## Commandes Générales

```bash
# Lancer tous les tests
npm run test

# Tests en mode watch (relance auto)
npm run test:watch

# Tests avec rapport de couverture
npm run test:cov

# Tests end-to-end
npm run test:e2e

# Tests en mode debug
npm run test:debug
```

## Tests par Module

```bash
# Tests du module messaging (161 tests)
npm run test -- --testPathPatterns="messaging"

# Tests du module scheduler (150 tests)
npm run test -- --testPathPatterns="scheduler"

# Tests du module auth
npm run test -- --testPathPatterns="auth"

# Tests du module users
npm run test -- --testPathPatterns="users"
```

## Tests avec Couverture par Module

```bash
# Couverture messaging + scheduler (summary)
npx jest --config jest.messaging-scheduler.config.js --coverage --coverageReporters="text-summary"

# Couverture messaging + scheduler (tableau detaille)
npx jest --config jest.messaging-scheduler.config.js --coverage

# Couverture messaging seul
npm run test:cov -- --testPathPatterns="messaging"

# Couverture scheduler seul
npm run test:cov -- --testPathPatterns="scheduler"
```

### Resultats attendus (messaging + scheduler)

```
Statements   : 95.69% ( 1068/1116 )
Branches     : 79.4%  ( 536/675 )
Functions    : 84.16% ( 202/240 )
Lines        : 96.86% ( 1019/1052 )

Test Suites: 15 passed, 15 total
Tests:       311 passed, 311 total
```

## Via Docker (Justfile)

```bash
# Lancer tous les tests dans le container
just test

# Entrer dans le container pour lancer manuellement
just shell
npm run test -- --testPathPatterns="messaging"
```

## Options Jest Utiles

| Option | Description |
|--------|-------------|
| `--watch` | Mode watch (relance sur changement) |
| `--coverage` | Génère un rapport de couverture |
| `--verbose` | Affiche le détail de chaque test |
| `--runInBand` | Exécute les tests séquentiellement |
| `--testPathPatterns="pattern"` | Filtre les fichiers de test |
| `--passWithNoTests` | Ne fail pas si aucun test trouvé |

## Structure des Tests

```
src/
├── modules/
│   ├── messaging/          # 10 suites, 161 tests
│   │   ├── *.spec.ts
│   │   ├── entities/*.spec.ts
│   │   ├── conversations/*.spec.ts
│   │   ├── messages/*.spec.ts
│   │   └── gateways/*.spec.ts
│   │
│   └── scheduler/          # 5 suites, 150 tests
│       ├── *.spec.ts
│       └── entities/*.spec.ts
│
test/
├── jest-e2e.json          # Config Jest E2E
└── *.e2e-spec.ts          # Tests end-to-end
```

---

*Dernière mise à jour : 15 janvier 2026*
