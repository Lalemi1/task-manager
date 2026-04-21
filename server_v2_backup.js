const express = require('express');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const app = express();

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration des sessions (cookie qui garde l'utilisateur connecté)
app.use(session({
  secret: 'votre_secret_changez_ceci_pour_une_longue_chaine_aleatoire',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1 jour
}));

const DATA_FILE = './todos.json';
const USERS_FILE = './users.json';

/// Helper: Charger tâches d'un utilisateur spécifique
function loadUserTodos(userId) {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    
    // Si c'est l'ancien format (tableau), on retourne [] pour commencer
    if (Array.isArray(data)) {
      return [];
    }
    
    return data[userId] || [];
  } catch {
    return [];
  }
}

// Helper: Sauvegarder tâches d'un utilisateur
function saveUserTodos(userId, todos) {
  let data = {};
  
  try {
    const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    // Si c'était un tableau ancien format, on ignore et on part d'un objet vide
    if (!Array.isArray(existing)) {
      data = existing;
    }
  } catch {}
  
  data[userId] = todos;
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}


// Middleware: Vérifier si connecté
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Middleware: Vérifier si PAS connecté (pour login/register)
function requireGuest(req, res, next) {
  if (!req.session.userId) {
    next();
  } else {
    res.redirect('/');
  }
}

// Page de LOGIN
app.get('/login', requireGuest, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Connexion - Task Manager</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg, #1e1e2f 0%, #2d2b42 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0;
        }
        .login-container {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          padding: 40px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
          width: 90%;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
          text-align: center;
          margin-bottom: 10px;
          font-size: 28px;
        }
        .subtitle {
          text-align: center;
          color: rgba(255,255,255,0.6);
          margin-bottom: 30px;
          font-size: 14px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: rgba(255,255,255,0.8);
        }
        input {
          width: 100%;
          padding: 15px;
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          color: white;
          font-family: inherit;
          font-size: 16px;
          box-sizing: border-box;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
        }
        button {
          width: 100%;
          padding: 18px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: inherit;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        .switch-link {
          text-align: center;
          margin-top: 20px;
          color: rgba(255,255,255,0.6);
        }
        .switch-link a {
          color: #667eea;
          text-decoration: none;
        }
        .error {
          background: rgba(255, 107, 107, 0.2);
          color: #FF6B6B;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>📝 Task Manager</h1>
        <div class="subtitle">Connectez-vous pour accéder à vos tâches</div>
        
        ${req.query.error ? `<div class="error">Email ou mot de passe incorrect</div>` : ''}
        
        <form action="/login" method="POST">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required placeholder="votre@email.com">
          </div>
          <div class="form-group">
            <label>Mot de passe</label>
            <input type="password" name="password" required placeholder="••••••••">
          </div>
          <button type="submit">Se connecter</button>
        </form>
        
        <div class="switch-link">
          Pas encore de compte ? <a href="/register">S'inscrire</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Page de REGISTER
app.get('/register', requireGuest, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Inscription - Task Manager</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg, #1e1e2f 0%, #2d2b42 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0;
        }
        .login-container {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          padding: 40px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
          width: 90%;
          max-width: 400px;
        }
        h1 { text-align: center; margin-bottom: 10px; font-size: 28px; }
        .subtitle {
          text-align: center;
          color: rgba(255,255,255,0.6);
          margin-bottom: 30px;
          font-size: 14px;
        }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-size: 14px; color: rgba(255,255,255,0.8); }
        input {
          width: 100%;
          padding: 15px;
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          color: white;
          font-family: inherit;
          font-size: 16px;
          box-sizing: border-box;
        }
        input:focus { outline: none; border-color: #667eea; }
        button {
          width: 100%;
          padding: 18px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: inherit;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
        }
        .switch-link {
          text-align: center;
          margin-top: 20px;
          color: rgba(255,255,255,0.6);
        }
        .switch-link a { color: #667eea; text-decoration: none; }
        .error {
          background: rgba(255, 107, 107, 0.2);
          color: #FF6B6B;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>📝 Task Manager</h1>
        <div class="subtitle">Créez votre compte pour commencer</div>
        
        ${req.query.error ? `<div class="error">${req.query.error}</div>` : ''}
        
        <form action="/register" method="POST">
          <div class="form-group">
            <label>Nom</label>
            <input type="text" name="name" required placeholder="Votre nom">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required placeholder="votre@email.com">
          </div>
          <div class="form-group">
            <label>Mot de passe</label>
            <input type="password" name="password" required placeholder="8 caractères minimum" minlength="6">
          </div>
          <button type="submit">Créer mon compte</button>
        </form>
        
        <div class="switch-link">
          Déjà un compte ? <a href="/login">Se connecter</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// TRAITEMENT LOGIN
app.post('/login', requireGuest, (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();
  
  const user = users.find(u => u.email === email.toLowerCase());
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.redirect('/login?error=1');
  }
  
  // Connecté !
  req.session.userId = user.id;
  req.session.userName = user.name;
  console.log('✅ Connexion:', user.email);
  res.redirect('/');
});

// TRAITEMENT REGISTER
app.post('/register', requireGuest, (req, res) => {
  const { name, email, password } = req.body;
  const users = loadUsers();
  
  // Vérifier si email existe déjà
  if (users.find(u => u.email === email.toLowerCase())) {
    return res.redirect('/register?error=Cet email est déjà utilisé');
  }
  
  // Créer l'utilisateur
  const newUser = {
    id: Date.now().toString(),
    name: name,
    email: email.toLowerCase(),
    password: bcrypt.hashSync(password, 10), // Hashé !
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  saveUsers(users);
  
  console.log('✅ Nouveau compte:', email);
  
  // Connecter automatiquement
  req.session.userId = newUser.id;
  req.session.userName = newUser.name;
  res.redirect('/');
});

// LOGOUT
app.get('/logout', requireAuth, (req, res) => {
  console.log('👋 Déconnexion:', req.session.userName);
  req.session.destroy();
  res.redirect('/login');
});

// L'APP PRINCIPALE (protégée par requireAuth)
app.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const userName = req.session.userName;
  
  const category = req.query.category || 'All';
  const search = req.query.search || '';
  const view = req.query.view || 'active'; // 'active' ou 'completed'

  let todos = loadUserTodos(userId); // CHARGEMENT PAR UTILISATEUR
  
    // Filtrage par catégorie et recherche
  if (category !== 'All') {
    todos = todos.filter(t => t.category === category);
  }
  if (search) {
    todos = todos.filter(t => t.text.toLowerCase().includes(search.toLowerCase()));
  }
  
  // Séparation selon l'onglet
  let displayedTodos = [];
  if (view === 'completed') {
    displayedTodos = todos.filter(t => t.completed);
    // Trier par date de complétion (plus récentes d'abord)
    displayedTodos.sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
  } else {
    displayedTodos = todos.filter(t => !t.completed);
    // Trier par priorité pour les actives
    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
    displayedTodos.sort((a, b) => {
      if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }

  
  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);
  const categories = ['All', 'Personal', 'Study', 'Important'];
  const total = todos.length;
  const completedCount = completedTodos.length;
  const progress = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  // HTML de l'app (simplifié ici, tu peux remettre ton design complet)
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mes Tâches - Task Manager</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg, #1e1e2f 0%, #2d2b42 100%);
          color: #fff;
          min-height: 100vh;
          margin: 0;
        }
        .app-container {
          max-width: 480px;
          margin: 0 auto;
          padding-bottom: 100px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px 20px;
          border-radius: 0 0 25px 25px;
          position: relative;
        }
        .user-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .user-name {
          font-size: 14px;
          opacity: 0.9;
        }
        .logout-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
          text-decoration: none;
        }
        h1 { margin: 0; font-size: 24px; }
        .content { padding: 20px; }
        .task-card {
          background: rgba(255,255,255,0.08);
          border-radius: 15px;
          padding: 18px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .priority-High { color: #FF6B6B; }
        .priority-Medium { color: #4ECDC4; }
        .priority-Low { color: #95E1D3; }
        .fab {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          font-size: 30px;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div class="app-container">
        <div class="header">
          <div class="user-bar">
            <div class="user-name">👋 Bonjour, ${userName}</div>
            <a href="/logout" class="logout-btn">Déconnexion</a>
          </div>
          <h1>📋 Mes Tâches</h1>
          <div style="opacity: 0.9; font-size: 14px; margin-top: 5px;">
            ${activeTodos.length} à faire • ${completedTodos.length} terminées
          </div>
        </div>
        
                <div class="content">
          <!-- Onglets -->
          <div style="display: flex; gap: 10px; margin-bottom: 20px; background: rgba(255,255,255,0.05); padding: 5px; border-radius: 15px;">
            <a href="/?view=active${category !== 'All' ? '&category=' + category : ''}${search ? '&search=' + encodeURIComponent(search) : ''}" 
               style="flex: 1; text-align: center; padding: 12px; border-radius: 10px; text-decoration: none; color: white; font-weight: 500; ${view === 'active' ? 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 4px 15px rgba(0,0,0,0.2);' : 'opacity: 0.7;'}">
              À faire <span style="font-size: 12px; opacity: 0.8; margin-left: 5px;">(${todos.filter(t => !t.completed).length})</span>
            </a>
            <a href="/?view=completed${category !== 'All' ? '&category=' + category : ''}${search ? '&search=' + encodeURIComponent(search) : ''}" 
               style="flex: 1; text-align: center; padding: 12px; border-radius: 10px; text-decoration: none; color: white; font-weight: 500; ${view === 'completed' ? 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 4px 15px rgba(0,0,0,0.2);' : 'opacity: 0.7;'}">
              Terminées <span style="font-size: 12px; opacity: 0.8; margin-left: 5px;">(${todos.filter(t => t.completed).length})</span>
            </a>
          </div>

          ${displayedTodos.length === 0 ? `
            <p style="text-align: center; opacity: 0.6; margin-top: 50px; padding: 20px;">
              ${view === 'completed' 
                ? 'Aucune tâche terminée. Commencez par en accomplir une ! 🎉' 
                : 'Aucune tâche en cours. Créez votre première !'}
            </p>
          ` : ''}
          
          ${displayedTodos.map(todo => `
            <div class="task-card" style="${todo.completed ? 'opacity: 0.7; border-left: 4px solid #4ECDC4;' : ''}">
              <div style="flex: 1;">
                <div style="font-weight: 600; ${todo.completed ? 'text-decoration: line-through; opacity: 0.8;' : ''}">${todo.text}</div>
                <div style="font-size: 12px; opacity: 0.7; margin-top: 4px; display: flex; gap: 10px; align-items: center;">
                  ${!todo.completed ? `<span class="priority-${todo.priority}" style="font-weight: 600;">${todo.priority}</span>` : ''}
                  <span>${todo.category}</span>
                  ${todo.completed 
                    ? `<span style="color: #4ECDC4;">✓ Terminée le ${new Date(todo.completedAt).toLocaleDateString('fr-FR')}</span>`
                    : `<span>⏰ ${new Date(todo.dueDate).toLocaleDateString('fr-FR')}</span>`
                  }
                </div>
              </div>
              <form method="POST" action="/toggle/${todo.id}?view=${view}" style="margin: 0;">
                <button type="submit" style="background: ${todo.completed ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255,255,255,0.1)'}; border: none; color: ${todo.completed ? '#4ECDC4' : 'white'}; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center;">
                  ${todo.completed ? '↩️' : '✓'}
                </button>
              </form>
            </div>
          `).join('')}
        </div>


// Route pour ajouter une tâche (simplifiée)
app.get('/add-task', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Nouvelle Tâche</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg, #1e1e2f 0%, #2d2b42 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
        }
        .form-container {
          background: rgba(255,255,255,0.05);
          padding: 40px;
          border-radius: 20px;
          width: 90%;
          max-width: 400px;
        }
        h1 { margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-size: 14px; }
        input, select {
          width: 100%;
          padding: 15px;
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          color: white;
          font-family: inherit;
          font-size: 16px;
          box-sizing: border-box;
        }
        button {
          width: 100%;
          padding: 18px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: inherit;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
        }
        a { color: rgba(255,255,255,0.6); text-decoration: none; display: block; text-align: center; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="form-container">
        <h1>➕ Nouvelle Tâche</h1>
        <form action="/add" method="POST">
          <div class="form-group">
            <label>Titre</label>
            <input type="text" name="text" required>
          </div>
          <div class="form-group">
            <label>Catégorie</label>
            <select name="category">
              <option value="Personal">Personal</option>
              <option value="Study">Study</option>
              <option value="Important">Important</option>
            </select>
          </div>
          <div class="form-group">
            <label>Priorité</label>
            <select name="priority">
              <option value="High">High</option>
              <option value="Medium" selected>Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div class="form-group">
            <label>Date d'échéance</label>
            <input type="datetime-local" name="dueDate" required>
          </div>
          <button type="submit">Créer</button>
          <a href="/">Annuler</a>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Ajout d'une tâche (protégé)
app.post('/toggle/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const view = req.query.view || 'active'; // Récupérer l'onglet actuel
  const todos = loadUserTodos(userId);
  const todo = todos.find(t => t.id === req.params.id);
  
  if (todo) {
    todo.completed = !todo.completed;
    // Si on complète, on enregistre la date
    if (todo.completed) {
      todo.completedAt = new Date().toISOString();
    } else {
      delete todo.completedAt; // Si on réactive, on supprime la date
    }
    saveUserTodos(userId, todos);
  }
  
  res.redirect('/?view=' + view); // Redirige vers le même onglet
});


// Toggle (protégé)
app.post('/toggle/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const todos = loadUserTodos(userId);
  const todo = todos.find(t => t.id === req.params.id);
  
  if (todo) {
    todo.completed = !todo.completed;
    saveUserTodos(userId, todos);
  }
  
    res.redirect('/?view=active');
});

app.listen(3000, () => {
  console.log('✨ Serveur multi-utilisateurs sur http://localhost:3000');
  console.log('📝 Créez un compte sur /register ou connectez-vous sur /login');
});
