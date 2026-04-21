const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();

// Configuration Express
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session (en mémoire pour l'instant, on pourrait utiliser MongoDB pour les sessions aussi plus tard)
app.use(session({
  secret: process.env.SESSION_SECRET || mon-premier-super-application-secret-2026,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// IMPORTANT : Remplace cette ligne par ton URI MongoDB
// Format : mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
const MONGO_URI = process.env.MONGODB_URI ||mongodb+srv://jlecinq_db_user:imvZxDoCalTpyDbk@cluster0.65ve2pg.mongodb.net/?appName=Cluster0;
const DB_NAME = 'taskmanager';

let db = null;
let usersCollection = null;
let todosCollection = null;

// Connexion à MongoDB
async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('✅ Connecté à MongoDB Atlas');
    
    db = client.db(DB_NAME);
    usersCollection = db.collection('users');
    todosCollection = db.collection('todos');
    
    // Créer des index pour accélérer les recherches
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await todosCollection.createIndex({ userId: 1 });
    
  } catch (err) {
    console.error('❌ Erreur connexion MongoDB:', err);
    process.exit(1);
  }
}

// Middleware d'authentification
function requireAuth(req, res, next) {
  if (req.session.userId) next();
  else res.redirect('/login');
}

function requireGuest(req, res, next) {
  if (!req.session.userId) next();
  else res.redirect('/');
}

// Routes d'authentification (simplifiées pour MongoDB)
app.get('/login', requireGuest, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connexion</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; color: white; margin: 0; }
    .container { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 40px; border-radius: 20px; width: 90%; max-width: 400px; border: 1px solid rgba(255,255,255,0.2); }
    h1 { text-align: center; margin-bottom: 30px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; opacity: 0.9; }
    input { width: 100%; padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.9); color: #333; font-size: 16px; box-sizing: border-box; }
    button { width: 100%; padding: 15px; border: none; border-radius: 10px; background: white; color: #667eea; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 10px; }
    .switch { text-align: center; margin-top: 20px; opacity: 0.8; }
    .switch a { color: white; text-decoration: underline; }
    .error { background: rgba(255,0,0,0.2); padding: 10px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 Task Manager</h1>
    ${req.query.error ? '<div class="error">Email ou mot de passe incorrect</div>' : ''}
    <form action="/login" method="POST">
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" required>
      </div>
      <div class="form-group">
        <label>Mot de passe</label>
        <input type="password" name="password" required>
      </div>
      <button type="submit">Se connecter</button>
    </form>
    <div class="switch">Pas encore de compte ? <a href="/register">S'inscrire</a></div>
  </div>
</body>
</html>
  `);
});

app.get('/register', requireGuest, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inscription</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; color: white; margin: 0; }
    .container { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 40px; border-radius: 20px; width: 90%; max-width: 400px; border: 1px solid rgba(255,255,255,0.2); }
    h1 { text-align: center; margin-bottom: 30px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; opacity: 0.9; }
    input { width: 100%; padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.9); color: #333; font-size: 16px; box-sizing: border-box; }
    button { width: 100%; padding: 15px; border: none; border-radius: 10px; background: white; color: #667eea; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 10px; }
    .switch { text-align: center; margin-top: 20px; opacity: 0.8; }
    .switch a { color: white; text-decoration: underline; }
    .error { background: rgba(255,0,0,0.2); padding: 10px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 Task Manager</h1>
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
    <div class="switch">Déjà un compte ? <a href="/login">Se connecter</a></div>
  </div>
</body>
</html>
  `);
});

// LOGIN avec MongoDB
app.post('/login', requireGuest, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.redirect('/login?error=1');
    }
    
    req.session.userId = user._id.toString();
    req.session.userName = user.name;
    res.redirect('/?view=active');
  } catch (err) {
    console.error('Erreur login:', err);
    res.redirect('/login?error=1');
  }
});

// REGISTER avec MongoDB
app.post('/register', requireGuest, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Vérifier si email existe déjà
    const existing = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.redirect('/register?error=Cet email existe déjà');
    }
    
    // Créer l'utilisateur
    const newUser = {
      name,
      email: email.toLowerCase(),
      password: bcrypt.hashSync(password, 10),
      createdAt: new Date()
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    req.session.userId = result.insertedId.toString();
    req.session.userName = name;
    res.redirect('/?view=active');
  } catch (err) {
    console.error('Erreur register:', err);
    res.redirect('/register?error=Erreur serveur');
  }
});

// LOGOUT
app.get('/logout', requireAuth, (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// APP PRINCIPALE (MongoDB)
app.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userName = req.session.userName;
    const view = req.query.view || 'active';
    
    // Récupérer les tâches de l'utilisateur depuis MongoDB
    const todos = await todosCollection.find({ userId }).toArray();
    
    // Trier selon l'onglet
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
    
    // HTML simplifié
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mes Tâches</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #1a1a2e; color: white; margin: 0; min-height: 100vh; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 0 0 20px 20px; }
    .user-bar { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px; }
    .logout { color: white; text-decoration: none; background: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; }
    h1 { margin: 0; font-size: 24px; }
    .content { padding: 20px; max-width: 600px; margin: 0 auto; }
    .tabs { display: flex; gap: 10px; margin: 20px 0; background: rgba(255,255,255,0.05); padding: 5px; border-radius: 15px; }
    .tab { flex: 1; text-align: center; padding: 12px; border-radius: 10px; text-decoration: none; color: white; opacity: 0.7; }
    .tab.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); opacity: 1; }
    .task { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .task.completed { opacity: 0.6; border-left: 4px solid #4ECDC4; }
    .task-title { font-weight: 600; }
    .task-meta { font-size: 12px; opacity: 0.7; margin-top: 5px; }
    .priority-High { color: #FF6B6B; }
    .priority-Medium { color: #4ECDC4; }
    .priority-Low { color: #95E1D3; }
    .fab { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; color: white; font-size: 30px; cursor: pointer; }
    .empty { text-align: center; opacity: 0.6; margin-top: 50px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="user-bar">
      <span>👋 Bonjour, ${userName}</span>
      <a href="/logout" class="logout">Déconnexion</a>
    </div>
    <h1>📋 Mes Tâches</h1>
    <div style="opacity: 0.9; font-size: 14px; margin-top: 5px;">
      ${activeCount} à faire • ${completedCount} terminées
    </div>
  </div>
  
  <div class="content">
    <div class="tabs">
      <a href="/?view=active" class="tab ${view === 'active' ? 'active' : ''}">À faire (${activeCount})</a>
      <a href="/?view=completed" class="tab ${view === 'completed' ? 'active' : ''}">Terminées (${completedCount})</a>
    </div>
    
    ${displayedTodos.length === 0 ? `
      <div class="empty">
        ${view === 'completed' ? 'Aucune tâche terminée' : 'Aucune tâche en cours'}
      </div>
    ` : ''}
    
    ${displayedTodos.map(todo => `
      <div class="task ${todo.completed ? 'completed' : ''}">
        <div>
          <div class="task-title" style="${todo.completed ? 'text-decoration: line-through;' : ''}">${todo.text}</div>
          <div class="task-meta">
            ${!todo.completed ? `<span class="priority-${todo.priority}">${todo.priority}</span> • ` : ''}
            <span>${todo.category}</span>
            ${todo.completed 
              ? `• <span style="color: #4ECDC4;">✓ Terminée</span>`
              : `• ${new Date(todo.dueDate).toLocaleDateString('fr-FR')}`
            }
          </div>
        </div>
        <form method="POST" action="/toggle/${todo._id}?view=${view}" style="margin: 0;">
          <button type="submit" style="background: ${todo.completed ? 'rgba(78, 205, 196, 0.3)' : 'rgba(255,255,255,0.1)'}; border: none; color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 18px;">
            ${todo.completed ? '↩️' : '✓'}
          </button>
        </form>
      </div>
    `).join('')}
  </div>
  
  <button class="fab" onclick="location.href='/add-task'">+</button>
</body>
</html>
    `);
  } catch (err) {
    console.error('Erreur chargement tâches:', err);
    res.status(500).send('Erreur serveur');
  }
});

// Page ajout tâche
app.get('/add-task', requireAuth, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle Tâche</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; color: white; margin: 0; }
    .container { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; width: 90%; max-width: 400px; }
    h1 { margin-bottom: 30px; text-align: center; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; }
    input, select { width: 100%; padding: 15px; border: none; border-radius: 10px; font-size: 16px; box-sizing: border-box; }
    button { width: 100%; padding: 18px; border: none; border-radius: 10px; background: white; color: #667eea; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 10px; }
    a { color: white; text-decoration: none; display: block; text-align: center; margin-top: 20px; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="container">
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

// AJOUT TÂCHE (MongoDB)
app.post('/add', requireAuth, async (req, res) => {
  try {
    const { text, category, priority, dueDate } = req.body;
    
    if (text && text.trim()) {
      await todosCollection.insertOne({
        userId: req.session.userId,
        text: text.trim(),
        category: category || 'Personal',
        priority: priority || 'Medium',
        dueDate: new Date(dueDate), // Stocker comme Date MongoDB
        completed: false,
        createdAt: new Date()
      });
      console.log('✅ Tâche ajoutée pour:', req.session.userName);
    }
    
    res.redirect('/?view=active');
  } catch (err) {
    console.error('Erreur ajout tâche:', err);
    res.redirect('/?view=active');
  }
});

// TOGGLE TÂCHE (MongoDB)
app.post('/toggle/:id', requireAuth, async (req, res) => {
  try {
    const view = req.query.view || 'active';
    const todo = await todosCollection.findOne({ 
      _id: new ObjectId(req.params.id),
      userId: req.session.userId
    });
    
    if (todo) {
      const newCompleted = !todo.completed;
      const update = { 
        $set: { 
          completed: newCompleted,
          completedAt: newCompleted ? new Date() : null
        }
      };
      
      await todosCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        update
      );
    }
    
    res.redirect('/?view=' + view);
  } catch (err) {
    console.error('Erreur toggle:', err);
    res.redirect('/');
  }
});

// Démarrer le serveur après connexion MongoDB
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✨ Serveur MongoDB sur http://localhost:${PORT}`);
    console.log('🗄️  Base de données: MongoDB Atlas');
  });
});
