# Mahana — Jeu du restaurant

Application de roue des cadeaux utilisable avec deux tablettes :

- une tablette administrateur pour gérer les lots et autoriser les parties ;
- une tablette client pour participer et tourner la roue.

## Première installation

PostgreSQL 15 ou plus récent doit être installé sur le PC.

Lancez ensuite la configuration sécurisée :

```powershell
cd backend
npm.cmd run setup
```

Le script demande localement :

- le mot de passe PostgreSQL ;
- l’adresse email du premier administrateur ;
- un nouveau mot de passe administrateur robuste.

Les mots de passe saisis ne sont jamais affichés. Le script crée la base, applique les migrations et importe les anciennes données locales.

Installez ensuite le frontend :

```powershell
cd frontend
npm.cmd install
```

## Lancer l’application

Backend :

```powershell
cd backend
npm.cmd run dev
```

Frontend :

```powershell
cd frontend
npm.cmd run dev
```

Les deux terminaux doivent rester ouverts.

## Accès

Sur le PC :

- Client : `http://localhost:5173/`
- Administration : `http://localhost:5173/admin/login`

Sur les tablettes, remplacez `localhost` par l’adresse IP du PC. Tous les appareils doivent être connectés au même réseau Wi-Fi.

## Fonctionnement

1. L’administrateur ajoute les lots et configure leurs stocks et probabilités.
2. Il clique sur « Autoriser le prochain client ».
3. Le client s’inscrit et tourne la roue.
4. Le résultat est enregistré et le stock du lot gagné est diminué.
5. L’autorisation s’arrête automatiquement après la partie.
6. L’administrateur autorise ensuite le client suivant.

## Sécurité

- mots de passe administrateur hachés avec bcrypt ;
- cookie de session `HttpOnly` et `SameSite=Strict` ;
- expiration des sessions après deux heures ;
- révocation des sessions après changement du mot de passe ;
- cinq tentatives de connexion maximum par période de quinze minutes ;
- secret JWT généré automatiquement ;
- routes administrateur protégées ;
- aucune information technique sensible dans les réponses d’erreur.

Le mot de passe administrateur peut être modifié depuis la page « Sécurité ».

## Tests

Backend :

```powershell
cd backend
npm.cmd test
```

Frontend :

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```
