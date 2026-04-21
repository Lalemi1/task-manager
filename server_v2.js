const express = require('express');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'votre_secret_changez_ceci',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

const DATA_FILE = './todos.json';
const USERS_FILE = './users.json';

function loadUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } 
  catch { return []; }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function loadUserTodos(userId) {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (Array.isArray(data)) return [];
    return data[userId] || [];
  } catch { return []; }
}

function saveUserTodos(userId, todos) {
  let data = {};
  try {
    const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!Array.isArray(existing)) data = existing;
  } catch {}
  data[userId] = todos;
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function requireAuth(req, res, next) {
  if (req.session.userId) next();
  else res.redirect('/login');
}

function requireGuest(req, res, next) {
  if (!req.session.userId) next();
  else res.redirect('/');
}

// LOGIN PAGE
app.get('/login', requireGuest, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connexion</title>
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
    .container {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      padding: 40px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      width: 90%;
      max-width: 400px;
    }
    h1 { text-align: center; margin-bottom: 10px; }
    .subtitle { text-align: center; color: rgba(255,255,255,0.6); margin-bottom: 30px; font-size: 14px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; font-size: 14px; }
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
    }
    .switch-link { text-align: center; margin-top: 20px; color: rgba(255,255,255,0.6); }
    .switch-link a { color: #667eea; text-decoration: none; }
    .error { background: rgba(255, 107, 107, 0.2); color: #FF6B6B; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 Task Manager</h1>
    <div class="subtitle">Connectez-vous</div>
    ${req.query.error ? '<div class="error">Email ou mot de passe incorrect</div>' : ''}
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

// REGISTER PAGE
app.get('/register', requireGuest, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inscription</title>
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
    .container {
      background: rgba(255,255,255,0.05);
      padding: 40px;
      border-radius: 20px;
      width: 90%;
      max-width: 400px;
    }
    h1 { text-align: center; margin-bottom: 10px; }
    .subtitle { text-align: center; color: rgba(255,255,255,0.6); margin-bottom: 30px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; font-size: 14px; }
    input {
      width: 100%;
      padding: 15px;
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      background: rgba(255,255,255,0.05);
      color: white;
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
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    .switch-link { text-align: center; margin-top: 20px; color: rgba(255,255,255,0.6); }
    .switch-link a { color: #667eea; text-decoration: none; }
    .error { background: rgba(255, 107, 107, 0.2); color: #FF6B6B; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 Task Manager</h1>
    <div class="subtitle">Créez votre compte</div>
    ${req.query.error ? `<div class="error">${req.query.error}</div>` : ''}
    <form action="/register" method="POST">
      <div class="form-group">
        <label>Nom</label>
        <input type="text" name="name" required>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" required>
      </div>
      <div class="form-group">
        <label>Mot de passe</label>
        <input type="password" name="password" required minlength="6">
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

// AUTH ROUTES
app.post('/login', requireGuest, (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.email === email.toLowerCase());
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.redirect('/login?error=1');
  }
  
  req.session.userId = user.id;
  req.session.userName = user.name;
  res.redirect('/?view=active');
});

app.post('/register', requireGuest, (req, res) => {
  const { name, email, password } = req.body;
  const users = loadUsers();
  
  if (users.find(u => u.email === email.toLowerCase())) {
    return res.redirect('/register?error=Cet email existe déjà');
  }
  
  const newUser = {
    id: Date.now().toString(),
    name,
    email: email.toLowerCase(),
    password: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  saveUsers(users);
  
  req.session.userId = newUser.id;
  req.session.userName = newUser.name;
  res.redirect('/?view=active');
});

app.get('/logout', requireAuth, (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// MAIN APP WITH TABS
app.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const userName = req.session.userName;
  const view = req.query.view || 'active';
  
  let todos = loadUserTodos(userId);
  
  // Sort for display
  let displayedTodos = [];
  if (view === 'completed') {
    displayedTodos = todos.filter(t => t.completed);
    displayedTodos.sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
  } else {
    displayedTodos = todos.filter(t => !t.completed);
    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
    displayedTodos.sort((a, b) => {
      if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }
  
  const activeCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;

  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mes Tâches</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
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
    }
    .user-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .user-name { font-size: 14px; opacity: 0.9; }
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
    
    /* Tabs */
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      background: rgba(255,255,255,0.05);
      padding: 5px;
      border-radius: 15px;
    }
    .tab {
      flex: 1;
      text-align: center;
      padding: 12px;
      border-radius: 10px;
      text-decoration: none;
      color: white;
      font-weight: 500;
      transition: all 0.3s;
    }
    .tab.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    .tab:not(.active) { opacity: 0.7; }
    .tab span { font-size: 12px; opacity: 0.8; margin-left: 5px; }
    
    /* Tasks */
    .task-card {
      background: rgba(255,255,255,0.08);
      border-radius: 15px;
      padding: 18px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.3s;
    }
    .task-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.12); }
    .task-card.completed { opacity: 0.7; border-left: 4px solid #4ECDC4; }
    .task-card.completed .task-title { text-decoration: line-through; opacity: 0.8; }
    
    .task-title { font-weight: 600; font-size: 16px; margin-bottom: 5px; }
    .task-meta {
      font-size: 12px;
      opacity: 0.7;
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .priority-High { color: #FF6B6B; font-weight: 600; }
    .priority-Medium { color: #4ECDC4; font-weight: 600; }
    .priority-Low { color: #95E1D3; font-weight: 600; }
    .completed-date { color: #4ECDC4; }
    
    .check-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.1);
      color: white;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .check-btn:hover { background: rgba(78, 205, 196, 0.3); color: #4ECDC4; }
    
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
    .empty-state {
      text-align: center;
      opacity: 0.6;
      margin-top: 50px;
      padding: 20px;
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
        ${activeCount} à faire • ${completedCount} terminées
      </div>
    </div>
    
    <div class="content">
      <!-- Tabs Navigation -->
      <div class="tabs">
        <a href="/?view=active" class="tab ${view === 'active' ? 'active' : ''}">
          À faire <span>(${activeCount})</span>
        </a>
        <a href="/?view=completed" class="tab ${view === 'completed' ? 'active' : ''}">
          Terminées <span>(${completedCount})</span>
        </a>
      </div>

      ${displayedTodos.length === 0 ? `
        <div class="empty-state">
          <div style="font-size: 50px; margin-bottom: 20px;">📝</div>
          <div>${view === 'completed' ? 'Aucune tâche terminée. Commencez par en accomplir une !' : 'Aucune tâche en cours. Créez votre première !'}</div>
        </div>
      ` : ''}
      
      ${displayedTodos.map(todo => `
        <div class="task-card ${todo.completed ? 'completed' : ''}">
          <div style="flex: 1;">
            <div class="task-title">${todo.text}</div>
            <div class="task-meta">
              ${!todo.completed ? `<span class="priority-${todo.priority}">${todo.priority}</span>` : ''}
              <span>${todo.category}</span>
              ${todo.completed 
                ? `<span class="completed-date">✓ Terminée le ${new Date(todo.completedAt || Date.now()).toLocaleDateString('fr-FR')}</span>`
                : `<span>⏰ ${new Date(todo.dueDate).toLocaleDateString('fr-FR')}</span>`
              }
            </div>
          </div>
          <form method="POST" action="/toggle/${todo.id}?view=${view}" style="margin: 0;">
            <button type="submit" class="check-btn" title="${todo.completed ? 'Réactiver' : 'Terminer'}">
              ${todo.completed ? '↩️' : '✓'}
            </button>
          </form>
        </div>
      `).join('')}
    </div>
  </div>
  
  <button class="fab" onclick="location.href='/add-task'">+</button>
</body>
</html>
  `);
});

// ADD TASK PAGE
app.get('/add-task', requireAuth, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
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

// ADD TASK POST
app.post('/add', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { text, category, priority, dueDate } = req.body;
  
  if (text && text.trim()) {
    const todos = loadUserTodos(userId);
    todos.push({
      id: Date.now().toString(),
      text: text.trim(),
      category: category || 'Personal',
      priority: priority || 'Medium',
      dueDate: dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    });
    saveUserTodos(userId, todos);
  }
  
  res.redirect('/?view=active');
});

// TOGGLE TASK
app.post('/toggle/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const view = req.query.view || 'active';
  const todos = loadUserTodos(userId);
  const todo = todos.find(t => t.id === req.params.id);
  
  if (todo) {
    todo.completed = !todo.completed;
    if (todo.completed) {
      todo.completedAt = new Date().toISOString();
    } else {
      delete todo.completedAt;
    }
    saveUserTodos(userId, todos);
  }
  
  res.redirect('/?view=' + view);
});

app.listen(3000, () => {
  console.log('✨ Serveur sur http://localhost:3000');
  console.log('Onglets: À faire / Terminées');
});
