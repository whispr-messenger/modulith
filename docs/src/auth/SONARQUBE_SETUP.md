# Configuration SonarQube pour Auth Service

## Secrets GitHub à configurer

### Pour le repository `auth-service`
Aller sur https://github.com/whispr-messenger/auth-service/settings/secrets/actions

1. **SONAR_TOKEN** : Token d'authentification SonarQube
   - Généré depuis : https://sonarqube.whispr.epitech-msc2026.me
   - Compte > Security > Generate Tokens
   - Type : Global Analysis Token
   - Nom suggéré : `auth-service-github-ci`

2. **SONAR_HOST_URL** : `https://sonarqube.whispr.epitech-msc2026.me` ✅ (configuré)

3. **SONAR_PROJECT_KEY** : `whispr-messenger_auth-service_11813afb-b949-4baf-aa3f-7d12c436cb56` (optionnel, défini dans sonar-project.properties)

### Pour l'organisation `whispr-messenger` (optionnel)
Pour partager ces secrets avec tous les repositories :

```bash
# Après avoir configuré les permissions org admin
gh auth refresh -h github.com -s admin:org
gh secret set SONAR_HOST_URL --body "https://sonarqube.whispr.epitech-msc2026.me" --org whispr-messenger
gh secret set SONAR_TOKEN --body "VOTRE_TOKEN" --org whispr-messenger
```

## Configuration du projet SonarQube

- **URL** : https://sonarqube.whispr.epitech-msc2026.me
- **Project Key** : `whispr-messenger_auth-service_11813afb-b949-4baf-aa3f-7d12c436cb56`
- **Project Name** : Whispr Auth Service
- **Main Branch** : main
- **Edition** : Community (limitations sur l'analyse des pull requests)

### Limitations SonarQube Community Edition

⚠️ **Important** : SonarQube Community Edition ne supporte que l'analyse de la branche principale.

**Fonctionnalités disponibles :**
- ✅ Analyse de la branche principale (main) uniquement
- ✅ Quality Gates sur main
- ✅ Code coverage sur main
- ✅ Détection de bugs et vulnerabilités sur main

**Fonctionnalités indisponibles (Developer+ Edition requis) :**
- ❌ Analyse des branches de feature
- ❌ Comparaison PR avec la branche de base
- ❌ Commentaires automatiques sur les PR
- ❌ Analyse différentielle des changements uniquement
- ❌ Multi-branch analysis

**Configuration actuelle :**
- SonarQube s'exécute uniquement quand le code est mergé dans `main`
- Les PR sont validées avec les autres outils (linting, tests, build)
- L'analyse complète de qualité se fait après merge
- Condition: `if: github.ref == 'refs/heads/main'`

## Vérification

Une fois les secrets configurés, les workflows CI/CD incluront automatiquement :
- Analyse de qualité de code
- Couverture de tests
- Détection de vulnérabilités
- Quality Gates

Les résultats seront visibles dans :
- SonarQube : https://sonarqube.whispr.epitech-msc2026.me/dashboard?id=whispr-messenger_auth-service_11813afb-b949-4baf-aa3f-7d12c436cb56
- GitHub Actions : onglet Actions de votre repository