# Discord PR Notifications Setup

Ce guide vous explique comment configurer les notifications Discord pour vos Pull Requests en utilisant l'action GitHub officielle `discord-webhook-action`.

## 🎯 Fonctionnalités

Le workflow `discord-pr-notifications.yml` utilise l'action [tsickert/discord-webhook@v7.0.0](https://github.com/marketplace/actions/discord-webhook-action) pour envoyer des notifications Discord pour :

### Pull Requests
- 🆕 **Ouverture** d'une nouvelle PR
- 🔄 **Réouverture** d'une PR fermée
- ✅ **Merge** d'une PR
- ❌ **Fermeture** d'une PR (sans merge)
- 👀 **Marquage** comme "ready for review"

### Reviews
- ✅ **Approbation** d'une PR
- ❌ **Demande de modifications**
- 💬 **Commentaires** de review

## 🚀 Configuration

### 1. Créer un Webhook Discord

1. Allez dans votre serveur Discord
2. Cliquez sur le nom du serveur → **Paramètres du serveur**
3. Dans la barre latérale, cliquez sur **Intégrations**
4. Cliquez sur **Webhooks** → **Nouveau Webhook**
5. Configurez le webhook :
   - **Nom** : `GitHub PR Notifications` (ou autre)
   - **Canal** : Sélectionnez le canal où vous voulez recevoir les notifications
   - **Avatar** : Vous pouvez mettre le logo GitHub ou autre
6. Cliquez sur **Copier l'URL du Webhook**

### 2. Ajouter le Secret GitHub

1. Allez dans votre repository GitHub
2. Cliquez sur **Settings** (Paramètres)
3. Dans la barre latérale, cliquez sur **Secrets and variables** → **Actions**
4. Cliquez sur **New repository secret**
5. Créez un secret avec :
   - **Name** : `DISCORD_WEBHOOK_URL`
   - **Secret** : Collez l'URL du webhook Discord que vous avez copiée
6. Cliquez sur **Add secret**

### 3. Tester le Workflow

Une fois le secret configuré, le workflow se déclenchera automatiquement lors de :
- L'ouverture d'une nouvelle PR
- La réouverture d'une PR
- La fermeture/merge d'une PR
- Le marquage d'une PR comme "ready for review"
- La soumission d'une review

## ✨ Avantages de l'Action Discord Webhook

L'action `tsickert/discord-webhook@v7.0.0` offre plusieurs avantages :

- 🔧 **Configuration simplifiée** : Plus besoin de manipuler JSON manuellement
- 🛡️ **Robustesse** : Gestion d'erreurs intégrée et validation des inputs
- 🎨 **Embeds riches** : Support natif des embeds Discord avec couleurs, thumbnails, etc.
- 📱 **Responsive** : Optimisé pour l'affichage mobile et desktop
- 🔄 **Maintenance** : Action activement maintenue avec support Node 20

## 📋 Format des Notifications

### Notification de PR
Les notifications incluent :
- 🏷️ **Titre** avec emoji selon l'action (🆕 ouverture, ✅ merge, etc.)
- 🔗 **Lien direct** vers la PR
- 🌿 **Branches** (source → destination)
- � **Auteur** avec lien vers le profil
- 📊 **Statistiques** de changements (+additions -deletions)
- 🏷️ **Labels** de la PR (si présents)
- 📝 **Description** de la PR (tronquée à 200 caractères)
- 🖼️ **Avatar** de l'auteur en thumbnail
- ⏰ **Timestamp** de création/modification

### Notification de Review
Les notifications incluent :
- 🏷️ **Titre** avec état de la review (✅ approved, ❌ changes requested, 💬 commented)
- � **Lien direct** vers la review
- � **Reviewer** et **Auteur** avec liens vers les profils
- 💬 **Commentaire** de la review (tronqué à 300 caractères)
- 🖼️ **Avatar** du reviewer en thumbnail
- ⏰ **Timestamp** de soumission

## 🎨 Couleurs des Notifications

- 🆕 **Nouvelle PR** : Bleu (`3447003`)
- 🔄 **PR réouverte** : Jaune (`16776960`)
- ✅ **PR mergée** : Vert (`65280`)
- ❌ **PR fermée** : Rouge (`16711680`)
- 👀 **Ready for review** : Bleu (`3447003`)
- ✅ **Review approuvée** : Vert (`65280`)
- ❌ **Changements demandés** : Rouge (`16711680`)
- 💬 **Commentaire** : Gris (`9936031`)

## 🔧 Personnalisation

### Modifier les couleurs
Changez les valeurs dans les `case` statements du workflow :
```yaml
"opened")
  COLOR="3447003"  # Bleu
  ACTION_EMOJI="🆕"
```

### Ajouter des événements
Modifiez la section `on` du workflow :
```yaml
pull_request:
  types: [opened, reopened, closed, ready_for_review, assigned, labeled]
```

### Personnaliser l'apparence
Modifiez les paramètres de l'action Discord :
```yaml
- name: Send Discord notification
  uses: tsickert/discord-webhook@v7.0.0
  with:
    webhook-url: ${{ secrets.DISCORD_WEBHOOK_URL }}
    username: "Mon Bot GitHub"  # Nom personnalisé
    avatar-url: "https://example.com/custom-avatar.png"  # Avatar personnalisé
```

### Filtrer par labels
Ajoutez une condition pour certains labels uniquement :
```yaml
if: github.event.pull_request.draft == false && contains(github.event.pull_request.labels.*.name, 'important')
```

## 🛠️ Troubleshooting

### Le webhook ne fonctionne pas
1. ✅ Vérifiez que l'URL du webhook Discord est correcte dans les secrets
2. ✅ Vérifiez que le secret `DISCORD_WEBHOOK_URL` est bien configuré
3. ✅ Consultez les logs du workflow dans GitHub Actions
4. ✅ Testez l'URL du webhook avec curl ou Postman

### Les notifications ne s'affichent pas correctement
1. ✅ Vérifiez que le webhook a les permissions d'écrire dans le canal
2. ✅ Vérifiez que l'URL du webhook n'a pas expiré
3. ✅ Vérifiez les limites Discord (embeds, caractères, etc.)

### Erreurs dans les workflows
- Consultez l'onglet "Actions" de votre repository GitHub
- Les logs détaillés vous indiqueront la cause exacte de l'erreur
- L'action Discord Webhook fournit des messages d'erreur explicites

### Notifications en double
- Le workflow ignore automatiquement les PRs en mode "draft"
- Chaque type d'événement déclenche une notification séparée (c'est normal)

## 📚 Ressources

- [Discord Webhook Action (GitHub Marketplace)](https://github.com/marketplace/actions/discord-webhook-action)
- [Repository de l'action](https://github.com/tsickert/discord-webhook)
- [Discord Webhooks Documentation](https://discord.com/developers/docs/resources/webhook)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub PR Events](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request)