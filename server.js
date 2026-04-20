const express = require('express');
const fs = require('fs');
const app = express();

// Pour lire les formulaires HTML
app.use(express.urlencoded({ extended: true }));

// Notre "base de données" : le fichier todos.json
const DATA_FILE = './todos.json';

// Fonction pour lire les tâches
function loadTodos() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Fonction pour sauvegarder les tâches
function saveTodos(todos) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));
}

// Page principale (affichage + formulaire)
app.get('/', (req, res) => {
  const todos = loadTodos();
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ma To-Do List</title>
      <style>
        body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; background: #f0f2f5; }
        h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
        form { margin-bottom: 30px; display: flex; gap: 10px; }
        input[type="text"] { flex: 1; padding: 12px; font-size: 16px; border: 1px solid #ddd; border-radius: 4px; }
        button { padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #0056b3; }
        ul { list-style: none; padding: 0; }
        li { background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
        .delete-btn { background: #dc3545; padding: 6px 12px; font-size: 14px; }
        .delete-btn:hover { background: #c82333; }
        .empty { color: #666; font-style: italic; text-align: center; padding: 40px; background: white; border-radius: 8px; }
      </style>
    </head>
    <body>
      <h1>📝 Ma To-Do List</h1>
      
      <form action="/add" method="POST">
        <input type="text" name="task" placeholder="Que dois-je faire ?" required>
        <button type="submit">Ajouter</button>
      </form>
      
      <ul>
  `;
  
  if (todos.length === 0) {
    html += '<li class="empty">Aucune tâche... profitez de votre journée ! ☕</li>';
  } else {
    todos.forEach((todo, index) => {
      html += `
        <li>
          <span>${todo}</span>
          <form action="/delete/${index}" method="POST" style="margin:0;">
            <button type="submit" class="delete-btn">❌ Supprimer</button>
          </form>
        </li>
      `;
    });
  }
  
  html += `
      </ul>
      <p style="color: #666; font-size: 12px; text-align: center; margin-top: 40px;">
        💾 Les données sont sauvegardées dans todos.json
      </p>
    </body>
    </html>
  `;
  
  res.send(html);
});

// Ajouter une tâche
app.post('/add', (req, res) => {
  const todos = loadTodos();
  const newTask = req.body.task;
  
  if (newTask && newTask.trim() !== '') {
    todos.push(newTask.trim());
    saveTodos(todos);
    console.log('✅ Ajouté:', newTask);
  }
  
  res.redirect('/');
});

// Supprimer une tâche
app.post('/delete/:id', (req, res) => {
  const todos = loadTodos();
  const id = parseInt(req.params.id);
  
  if (id >= 0 && id < todos.length) {
    const deleted = todos.splice(id, 1);
    saveTodos(todos);
    console.log('🗑️ Supprimé:', deleted[0]);
  }
  
  res.redirect('/');
});

app.listen(3000, () => {
  console.log('✨ Serveur To-Do démarré sur http://localhost:3000');
  console.log('📝 Ouvrez ce lien dans votre navigateur');
});
