# 📧 Configuration des Emails pour PANK

Ce guide vous explique comment configurer l'envoi d'emails réels pour la validation des comptes utilisateurs.

## 🎯 Services Recommandés

### 1. **RESEND** (⭐ Recommandé)
**Pourquoi ?** Simple, fiable, excellent pour les développeurs

#### Configuration :
1. **Créez un compte** : https://resend.com
2. **Vérifiez votre domaine** dans le dashboard
3. **Obtenez votre clé API** dans Settings > API Keys
4. **Configurez votre .env** :
```env
VITE_EMAIL_SERVICE=resend
VITE_EMAIL_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_FROM_EMAIL=noreply@votre-domaine.com
VITE_FROM_NAME=PANK - Gestion des présences
```

#### Tarifs :
- **Gratuit** : 3,000 emails/mois
- **Pro** : $20/mois pour 50,000 emails

---

### 2. **SENDGRID**
**Pourquoi ?** Service mature, très fiable, utilisé par de nombreuses entreprises

#### Configuration :
1. **Créez un compte** : https://sendgrid.com
2. **Vérifiez votre domaine** dans Settings > Sender Authentication
3. **Créez une clé API** dans Settings > API Keys
4. **Configurez votre .env** :
```env
VITE_EMAIL_SERVICE=sendgrid
VITE_EMAIL_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_FROM_EMAIL=noreply@votre-domaine.com
VITE_FROM_NAME=PANK - Gestion des présences
```

#### Tarifs :
- **Gratuit** : 100 emails/jour
- **Essentials** : $19.95/mois pour 50,000 emails

---

### 3. **MAILGUN**
**Pourquoi ?** Excellent pour les développeurs, API puissante

#### Configuration :
1. **Créez un compte** : https://mailgun.com
2. **Ajoutez votre domaine** dans Domains
3. **Configurez les DNS** selon les instructions
4. **Obtenez votre clé API** dans Settings > API Keys
5. **Configurez votre .env** :
```env
VITE_EMAIL_SERVICE=mailgun
VITE_EMAIL_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_EMAIL_DOMAIN=mg.votre-domaine.com
VITE_FROM_EMAIL=noreply@votre-domaine.com
VITE_FROM_NAME=PANK - Gestion des présences
```

#### Tarifs :
- **Gratuit** : 5,000 emails/mois (3 mois)
- **Foundation** : $35/mois pour 50,000 emails

---

### 4. **EMAILJS** (Frontend uniquement)
**Pourquoi ?** Gratuit, facile à configurer, pas besoin de backend

#### Configuration :
1. **Créez un compte** : https://emailjs.com
2. **Ajoutez un service email** (Gmail, Outlook, etc.)
3. **Créez un template** avec ces variables :
   - `{{to_email}}`
   - `{{to_name}}`
   - `{{verification_code}}`
   - `{{company_name}}`
   - `{{from_name}}`
4. **Installez le package** :
```bash
npm install @emailjs/browser
```
5. **Configurez votre .env** :
```env
VITE_EMAIL_SERVICE=emailjs
VITE_EMAILJS_SERVICE_ID=service_xxxxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxxxx
```

#### Tarifs :
- **Gratuit** : 200 emails/mois
- **Pro** : $15/mois pour 10,000 emails

---

## 🚀 Configuration Rapide

### Étape 1 : Choisissez votre service
Nous recommandons **Resend** pour sa simplicité.

### Étape 2 : Configurez votre domaine
Pour un envoi professionnel, utilisez votre propre domaine :
- `noreply@votre-entreprise.com`
- `verification@votre-entreprise.com`

### Étape 3 : Copiez le fichier .env
```bash
cp .env.example .env
```

### Étape 4 : Remplissez vos clés
Modifiez le fichier `.env` avec vos vraies clés API.

### Étape 5 : Testez
L'application détectera automatiquement la configuration et utilisera le service choisi.

---

## 🔧 Configuration DNS (pour domaine personnalisé)

### Pour Resend/SendGrid/Mailgun :
Ajoutez ces enregistrements DNS :

#### SPF Record :
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

#### DKIM Record :
```
Type: TXT
Name: resend._domainkey
Value: [Fourni par le service]
```

#### DMARC Record :
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:admin@votre-domaine.com
```

---

## 🧪 Test de Configuration

### Mode Démo (par défaut) :
```env
VITE_EMAIL_SERVICE=demo
```
- Affiche le code dans la console
- Montre une notification navigateur
- Aucun email réel envoyé

### Mode Production :
```env
VITE_EMAIL_SERVICE=resend
VITE_EMAIL_API_KEY=votre_vraie_cle
```
- Envoie des emails réels
- Gestion d'erreurs complète
- Logs détaillés

---

## 🛠️ Dépannage

### Problème : "Erreur envoi email"
**Solutions :**
1. Vérifiez votre clé API
2. Vérifiez que votre domaine est validé
3. Vérifiez les quotas de votre plan
4. Regardez les logs dans la console

### Problème : "Email non reçu"
**Solutions :**
1. Vérifiez le dossier spam
2. Vérifiez la configuration DNS
3. Testez avec un autre email
4. Vérifiez les logs du service

### Problème : "Domaine non vérifié"
**Solutions :**
1. Ajoutez les enregistrements DNS requis
2. Attendez la propagation (24-48h)
3. Utilisez un sous-domaine si nécessaire

---

## 📊 Comparaison des Services

| Service | Prix Gratuit | Prix Pro | Facilité | Fiabilité |
|---------|-------------|----------|----------|-----------|
| **Resend** | 3K/mois | $20/mois | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **SendGrid** | 100/jour | $20/mois | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Mailgun** | 5K/mois* | $35/mois | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **EmailJS** | 200/mois | $15/mois | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

*3 mois seulement

---

## 🎯 Recommandation Finale

**Pour débuter** : Utilisez **Resend** avec le plan gratuit
**Pour production** : **SendGrid** ou **Resend** selon vos besoins
**Pour simplicité** : **EmailJS** si vous voulez éviter la configuration serveur

Une fois configuré, vos utilisateurs recevront de beaux emails HTML avec leur code de vérification !