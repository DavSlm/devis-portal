# Setup — Portail devis Oshibori

Procédure pas-à-pas pour mettre en place l'environnement. **Fais une étape à la fois**, puis confirme-moi en chat avant de passer à la suivante.

Légende :
- 🧑 = tu fais
- 🤖 = je fais
- 📋 = tu me copies-colles l'info en chat

---

## Étape 1 — Upgrade Node.js vers v20 LTS 🧑

Ton Node actuel (v17) est trop ancien pour Next.js 15. On installe Node 20 via nvm (sans toucher le système).

Dans ton terminal, lance :

```bash
source ~/.nvm/nvm.sh
nvm install 20
nvm alias default 20
nvm use 20
node --version
```

**Attendu** : `v20.x.x`

✅ **Quand c'est fait, dis-moi « Node 20 OK »** et on passe à l'étape 2.

---

## Étape 2 — Scaffold Next.js 🤖

Je crée la base du projet Next.js 15 (TypeScript + App Router + Tailwind) dans `devis-portal/`.

Tu n'as rien à faire — je lance la commande et je te dis quand c'est prêt.

---

## Étape 3 — Compte GitHub + repo 🧑

But : versionner le code et permettre à Vercel de déployer automatiquement à chaque push.

1. Va sur [github.com](https://github.com) — connecte-toi (ou crée un compte avec `david@oshibori-concept.com`)
2. Clique **+ → New repository**
3. Nom : `devis-portal`
4. Visibilité : **Private** (recommandé)
5. **Ne coche rien** (pas de README, pas de .gitignore, pas de licence — on les a déjà en local)
6. Clique **Create repository**
7. Sur la page suivante, copie l'URL SSH ou HTTPS (ex. `https://github.com/ton-username/devis-portal.git`)

📋 **Copie-moi cette URL en chat.**

---

## Étape 4 — Compte Vercel + import du repo 🧑

But : déploiement automatique à chaque push GitHub, hébergement gratuit sur `oshibori-devis.vercel.app`.

1. Va sur [vercel.com/signup](https://vercel.com/signup)
2. Clique **Continue with GitHub** → connecte le même compte qu'à l'étape 3
3. Choisis le plan **Hobby (Free)**
4. Sur le dashboard, clique **Add New… → Project**
5. Trouve `devis-portal` dans la liste, clique **Import**
6. Sur la page de config :
   - Framework Preset : **Next.js** (devrait être auto-détecté)
   - Root Directory : **./** (par défaut)
   - **Ne touche rien d'autre**, clique **Deploy**
7. Attends ~2 min, Vercel build et déploie

📋 **Quand le déploiement est vert, copie-moi l'URL `*.vercel.app` qui s'affiche.**

---

## Étape 5 — Compte Supabase + projet 🧑

But : base Postgres managée pour stocker les demandes de devis, devis, sessions auth.

1. Va sur [supabase.com](https://supabase.com) → **Start your project**
2. Connecte-toi avec **GitHub** (même compte)
3. Crée une organisation : `Oshibori Concept`
4. Crée un projet :
   - Name : `devis-portal`
   - Database password : **génère un mot de passe fort et garde-le précieusement** (gestionnaire de mots de passe)
   - Region : **West EU (Paris)** ou **West EU (Ireland)**
   - Plan : **Free**
5. Attends ~2 min que le projet soit provisionné
6. Une fois prêt, dans le menu de gauche : **Project Settings (⚙️) → API**

📋 **Copie-moi en chat (sans les afficher en public) :**
- **Project URL** (ex. `https://xxxxx.supabase.co`)
- **anon public key** (clé publique côté client)
- **service_role key** (clé serveur — ⚠️ secrète, ne jamais l'exposer côté client)

---

## Étape 6 — Compte Resend (emails transactionnels) 🧑

But : envoi des magic links et notifications.

1. Va sur [resend.com](https://resend.com) → **Sign up**
2. Connecte-toi avec **GitHub**
3. Sur le dashboard, va dans **API Keys** → **Create API Key**
   - Name : `devis-portal-dev`
   - Permission : **Sending access**
4. **Copie immédiatement la clé** (elle ne sera plus affichée après)

📋 **Copie-moi la clé Resend en chat.**

Plus tard, on configurera le domaine `oshibori-concept.com` pour envoyer depuis `devis@oshibori-concept.com` au lieu de `onboarding@resend.dev`. Pour le proto, on utilise le domaine de test Resend, c'est OK.

---

## Étape 7 — Schéma Supabase 🤖

Je te prépare un script SQL avec les tables (`quote_requests`, `quotes`, `users`, etc.).

Tu n'as qu'à le coller dans **Supabase → SQL Editor → New query → Run**.

---

## Étape 8 — Variables d'environnement locales 🤖

Je crée le fichier `.env.local` à partir des clés que tu m'as données. Ce fichier reste sur ta machine, jamais commité.

---

## Étape 9 — Vercel env vars 🧑

But : permettre au site en prod (Vercel) d'accéder à Supabase et Resend.

Tu reportes les mêmes variables sur **Vercel → Project Settings → Environment Variables**. Je te liste exactement quoi mettre quand on en sera là.

---

## Étape 10 — Connecter le repo local au GitHub 🤖🧑

J'initialise git localement, fais le premier commit. Toi tu pousses (ou je te donne la commande exacte).

---

**Prochaine action : Étape 1 (upgrade Node).** Dis-moi quand c'est fait.

---

## Étape 11 — Activer le dashboard admin 🧑 (Sprint 2)

Une fois Sprint 2 déployé, deux configs Supabase à faire avant de pouvoir te connecter.

### 11.1 — Allowlist des redirect URLs

1. Va sur ton projet Supabase → **Authentication → URL Configuration**
2. Dans **Site URL**, mets : `https://devis-portal-vpmx.vercel.app`
3. Dans **Redirect URLs**, ajoute (un par ligne) :
   - `https://devis-portal-vpmx.vercel.app/**` (couvre toutes les routes : `/auth/callback`, `/quotes/*/auth`, etc.)
   - `http://localhost:3000/**` (pour le dev en local)
4. Sauvegarde

Pourquoi un wildcard `/**` ? On a deux endpoints d'auth :
- `/auth/callback` pour la connexion admin (`/admin`)
- `/quotes/[id]/auth` pour les magic links client (encode l'id du devis dans le path pour fiabiliser le redirect)

Sans ça, Supabase refuse les magic links → tu reçois une erreur après avoir cliqué le lien dans ton email.

### 11.2 — (Optionnel mais recommandé) SMTP Resend pour les emails Supabase

Par défaut, Supabase envoie depuis `noreply@mail.supabase.io` avec une limite de 3 emails/heure. Pour utiliser Resend (et envoyer depuis un domaine pro) :

1. Supabase → **Authentication → Emails → SMTP Settings → Enable Custom SMTP**
2. Host : `smtp.resend.com`
3. Port : `465`
4. User : `resend`
5. Password : ta clé API Resend (`re_…`)
6. Sender email : `onboarding@resend.dev` (provisoire, jusqu'à vérification du domaine `oshibori-concept.com`)

### 11.3 — Variable env `ADMIN_EMAILS` sur Vercel

Pour ajouter d'autres admins (ton équipe) sans toucher au code :

1. Vercel → Project Settings → Environment Variables
2. Ajoute `ADMIN_EMAILS` avec en valeur la liste séparée par virgules, ex. :
   `dasalama@icloud.com,david@oshibori-concept.com,equipe@oshibori-concept.com`
3. Redéploie

Si la variable n'est pas définie, seul `dasalama@icloud.com` est autorisé (fallback codé en dur).
