# Kubernetes Deployment Documentation

## Resources
- [Deployments - kubernetes.io](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Pods - kubernetes.io](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Kubernetes Pod Sizing - medium.com](https://medium.com/@selvamraju010/kubernetes-pod-sizing-9dbac1de29a6)
- [How to profile a NestJS application](https://dev.to/geampiere/how-to-profile-a-nestjs-application-482n)

## Quel est le rôle d'un `Deployment` ?

Un **deployment** Kubernetes est un objet qui permet de gérer le déploiement et la mise à jour d'applications conteneurisées de manière déclarative. Voici ses principales fonctions :

**Gestion des Pods**
Le deployment crée et maintient un nombre spécifié de réplicas de pods identiques. Si un pod échoue ou est supprimé, le deployment en crée automatiquement un nouveau pour maintenir le nombre désiré.

**Mises à jour progressives (Rolling Updates)**
Il permet de mettre à jour une application sans interruption de service. Les anciens pods sont remplacés progressivement par de nouveaux, garantissant qu'un certain nombre reste toujours disponible pendant la transition.

**Rollback facilité**
Si une mise à jour pose problème, le deployment permet de revenir rapidement à une version précédente de l'application en une seule commande.

**Scalabilité**
On peut facilement augmenter ou diminuer le nombre de réplicas d'une application selon les besoins, manuellement ou automatiquement.

**État désiré vs état actuel**
Le deployment maintient constamment l'état de l'application conforme à ce qui est déclaré dans sa configuration. Kubernetes surveille et corrige automatiquement les écarts.

En résumé, le deployment est l'un des objets les plus utilisés dans Kubernetes car il simplifie considérablement la gestion du cycle de vie des applications en production, en automatisant les tâches complexes de déploiement, mise à jour et maintien de la disponibilité.

---

## Pods

Les *Pods* sont la plus petite unité de *computing* que vous puissiez créer et gérer sur Kubernetes.

Un *Pod* (comme dans un *pod of whales* ou *pea pod*) est un groupe d'un ou plusieurs conteneurs avec un stockage, des ressources réseau partagées et une spécification de comment exécuter les conteneurs. Le contenu d'un Pod est toujours co-localisé, co-planifié, et s'exécutes dans un contexte partagé. Un Pod modélises un "hôte logique" spécifique à une application: il contient un ou plusieurs conteneurs applicatifs avec un couplage relativement fort. Dans un contexte non-cloud, les applications exécutées sur le même hôte physique ou machine virtuelle sont analogues à des applications cloud exécutées sur le même hôte logique.

Tout comme un conteneur applicatif, un pod peut contenir un conteneur d'initialisation qui s'exécutes pendant le démarrage du Pod. Vous pouvez également injecter des Pods éphémères pour débugger un pod en cours d'exécution.

### Qu'est ce qu'un Pod ?

Le contexte partagé d'un pod est un ensemble de namespaces Linux, cgroups et potentiellement d'autres facettes d'isolation - les mêmes chose qui isolent un conteneur. Au sein du contexte d'un Pod, les applications individuelles pourraient avoir d'avantage de sous isolations appliquées.

Un pod est similaire à un ensemble de conteneurs avec un namespace des volumes du système de fichier partagé.

Les pods d'un cluster Kubernetes sont utilisés de deux manières différentes:

- **Les pods exécutent un seul conteneur**. Le modèle "un conteneur par pod" est le cas d'usage le plus commun dans Kubernetes; dans ce cas, vous pouvez penser le pod comme un wrapper autour du conteneur; Kubernetes manages le pod plutot que de manager le conteneur directement.
- **Les pods qui exécutent plusieurs conteneurs devant fonctionner ensemble**. Un pod peut encapsuler une application composée de plusieurs [conteneurs co-localisés](https://kubernetes.io/docs/concepts/workloads/pods/#how-pods-manage-multiple-containers). Ces conteneurs forment un seule unité de cohésion.

    Grouper plusieurs conteneurs co-localisés et co-managés dans un seul pod est un cas d'usage relativement avancé. Vous devriez utiliser ce pattern seulement dans des cas spécifiques ou vos conteneurs sont fortement couplés.

    Vous n'avez pas besoin d'exécuter plusieurs conteneurs pour fournir de la réplication (pour la résilience ou la quantité); Si vous avez besoin de plusieurs replicas consultez ([Workload Management](https://kubernetes.io/docs/concepts/workloads/controllers/)).


---

## Dimensionnement des Pods

Lors du déploiement d'un application Kubernetes, l'une des considérations clés est le dimensionnement des pods.

Lors du dimensionnement d'un pod Kubernetes, il y a plusieurs facteurs à considérer comme la quantité de CPU, de mémoire RAM et de stockage requis, ainsi que le nombre de conteneurs dans le Pod.

### Stratégie de dimensionnement

Pour déterminer les bonnes valeurs la meilleure approche combine plusieurs méthodes: 

2. **Profiling en dev/staging**: Lancer des tests de charge représentatigs pour observer la consommation réelle (CPU, mémoire, I/O). Des outils comme `kubectl top`, Prometheus, ou des profilers applicatifs sont essentiels.
3. **Démarrer conservateur puis ajuster**: Commencez avec des valeurs modestes basées sur vos observations puis affinez progressivement en production selon les métriques réelles.
4. **Requests vs Limits**: 
    - **Requests**: ressources garanties par Kubernetes (utilisée lors du scheduling).
    - **Limits**: plafond maximal (peut déclencher un throttling CPU ou un out of memory (OOM) kill mémoire)

## Utiliser un Pod avec des ressources élevées VS. plusieurs replicas

Allouer des ressources élevées à un seul pod fait perdre plusieurs avantages des replicas:
- **Résilience**: Un replica qui crash n'affecte qu'une partie du traffic
- **Déploiements progressifs**: Les rollling updates sont plus sûres avec plusieurs replicas
- **Distribution de charge**: Plusieurs pods utilisent mieux les ressources du cluster que quelques gros pods.
- **Parallélisme**: Plus de replicas améne plus de parallélisme réel, surtout pour les requêtes concurrentes. Même avec beaucoup de CPU dans un pod, une application single-thread ne pourra en profiter pleinement.

> **Régle générale**: Priviliégiez plusieurs petits pods plutot qu'on gros mastodonte.

---

## Comment profiler une application NestJS ?

Le profilage est le processus de compréhension du fonctionnement interne d'une application lors de son exécution, l'usage de la mémoire, les goulots d'étranglement et plus.

### Qu'est ce que le profilage ?

**Profiler** signifies **mesurer** et analyser les performances de votre application pour identifer les problèmes d'efficaté.

Quand vous profilez une application, vous pouvez:
- Voir quelles fonctions mettent le plus de temps à s'exécuter
- Détecter les fuites de mémoire
- Identifier les services et processus les plus lents
- Optimiser les ressources avant qu'un problème survienne en production

En bref le profilage est la compréhension de ce qui se passe sous le capot.

### Profiler une application NestJS

Dans une application NestJS, vous pouvez profiler en utilisant plusieurs techniques:

2. **Interceptors**: Une manière propre de mesurer le temps de traitement des requêtes
3. **Middleware**: Capturer le temps de début et de fin des requêtes
4. **Memory tracking**: Utilisez `process.memoryUsage()` pour monitorer la mémoire.
5. **Log monitoring**: Enregistrez les temps d'exécution et les erreurs critiques.
6. **Outils externes**: Intégrez des plateformes de monitoring professionnelles.

Regardons maintenant les meilleurs outils à utiliser.

