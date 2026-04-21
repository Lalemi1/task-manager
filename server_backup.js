const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // IMPORTANT : pour recevoir les données JSON du fetch
const DATA_FILE = './todos.json';

function loadTodos() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveTodos(todos) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// NOUVEAU : Route pour réorganiser les tâches
app.post('/reorder', (req, res) => {
  const { orderedIds } = req.body; // Reçoit un tableau d'IDs dans le nouvel ordre
  
  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'Données invalides' });
  }
  
  const todos = loadTodos();
  
  // Créer un dictionnaire pour accès rapide
  const todoMap = {};
  todos.forEach(t => todoMap[t.id] = t);
  
  // Reconstruire le tableau dans le nouvel ordre
  const reorderedTodos = orderedIds.map(id => todoMap[id]).filter(Boolean);
  
  // Ajouter les tâches qui n'étaient pas dans la liste (au cas où)
  const remainingTodos = todos.filter(t => !orderedIds.includes(t.id));
  
  const finalTodos = [...reorderedTodos, ...remainingTodos];
  
  saveTodos(finalTodos);
  console.log('🔄 Ordre sauvegardé:', orderedIds);
  
  res.json({ success: true, message: 'Ordre mis à jour' });
});

// Le reste de tes routes existantes...
app.get('/', (req, res) => {
  const category = req.query.category || 'All';
  const search = req.query.search || '';
  
  let todos = loadTodos();
  
  // Filtrage (inchangé)
  if (category !== 'All') {
    todos = todos.filter(t => t.category === category);
  }
  if (search) {
    todos = todos.filter(t => t.text.toLowerCase().includes(search.toLowerCase()));
  }
  
  // IMPORTANT : On garde l'ordre du fichier JSON (pas de tri automatique)
  // On sépare juste les complétées et non-complétées pour l'affichage
  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);
  
  const categories = ['All', 'Personal', 'Study', 'Important'];
  
  const total = todos.length;
  const completed = completedTodos.length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  let html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Manager Pro - Drag & Drop</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg, #1e1e2f 0%, #2d2b42 100%);
          color: #fff;
          min-height: 100vh;
        }
        
        .app-container {
          max-width: 480px;
          margin: 0 auto;
          background: linear-gradient(180deg, #2d2b42 0%, #1e1e2f 100%);
          min-height: 100vh;
          padding-bottom: 100px;
        }
        
        .header {
          padding: 30px 20px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 0 0 25px 25px;
          margin-bottom: 20px;
        }
        
        h1 { font-size: 28px; margin-bottom: 5px; }
        .subtitle { opacity: 0.9; font-size: 14px; margin-bottom: 20px; }
        
        .search-container {
          position: relative;
        }
        
        .search-input {
          width: 100%;
          padding: 12px 20px 12px 45px;
          border: none;
          border-radius: 15px;
          background: rgba(255,255,255,0.2);
          color: white;
          font-size: 16px;
        }
        
        .search-input::placeholder { color: rgba(255,255,255,0.6); }
        
        .search-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
        }
        
        /* Navigation */
        .category-nav {
          display: flex;
          gap: 10px;
          padding: 15px 20px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        
        .category-btn {
          padding: 8px 20px;
          border-radius: 20px;
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 14px;
          white-space: nowrap;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }
        
        .category-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        /* Stats */
        .stats {
          padding: 0 20px 20px;
        }
        
        .progress-card {
          background: rgba(255,255,255,0.05);
          padding: 20px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        
        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 14px;
        }
        
        .progress-bar {
          height: 8px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          width: ${progress}%;
          transition: width 0.5s;
        }
        
        /* Zone de drag */
        .tasks-container {
          padding: 0 20px;
        }
        
        .section-title {
          font-size: 18px;
          margin-bottom: 15px;
          opacity: 0.8;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .drag-hint {
          font-size: 12px;
          opacity: 0.6;
          font-weight: normal;
        }
        
        /* Carte tâche draggable */
        .task-card {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 15px;
          padding: 18px;
          margin-bottom: 12px;
          cursor: grab;
          transition: all 0.3s;
          position: relative;
          user-select: none; /* Empêche la sélection de texte pendant le drag */
        }
        
        .task-card:active {
          cursor: grabbing;
          transform: scale(1.02);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          z-index: 100;
        }
        
        .task-card.dragging {
          opacity: 0.5;
          border: 2px dashed #667eea;
          background: rgba(102, 126, 234, 0.1);
        }
        
        .task-card.drag-over {
          border-top: 3px solid #667eea;
          margin-top: 5px;
        }
        
        .task-card.completed {
          opacity: 0.6;
          background: rgba(78, 205, 196, 0.1);
          border-left: 4px solid #4ECDC4;
        }
        
        .task-card.completed .task-title {
          text-decoration: line-through;
        }
        
        /* Handle de drag (poignée visible) */
        .drag-handle {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.3;
          cursor: grab;
          font-size: 20px;
          letter-spacing: 2px;
        }
        
        .task-content {
          margin-left: 25px;
        }
        
        .task-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        
        .task-title {
          font-weight: 600;
          font-size: 16px;
          flex: 1;
          margin-right: 10px;
        }
        
        .task-meta {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .priority-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .priority-High { background: rgba(255, 107, 107, 0.2); color: #FF6B6B; }
        .priority-Medium { background: rgba(78, 205, 196, 0.2); color: #4ECDC4; }
        .priority-Low { background: rgba(149, 225, 211, 0.2); color: #95E1D3; }
        
        .category-tag {
          font-size: 12px;
          opacity: 0.7;
          background: rgba(255,255,255,0.1);
          padding: 2px 8px;
          border-radius: 8px;
        }
        
        .due-date {
          font-size: 12px;
          opacity: 0.8;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .overdue {
          color: #FF6B6B;
          font-weight: 600;
        }
        
        /* Actions */
        .task-actions {
          display: flex;
          gap: 5px;
        }
        
        .icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .icon-btn:hover {
          background: rgba(255,255,255,0.2);
          transform: scale(1.1);
        }
        
        .check-btn:hover {
          background: #4ECDC4;
        }
        
        .delete-btn:hover {
          background: #FF6B6B;
        }
        
        /* Modal */
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
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
          z-index: 100;
        }
        
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          z-index: 1000;
          align-items: flex-end;
          justify-content: center;
        }
        
        .modal.active { display: flex; }
        
        .modal-content {
          background: #2d2b42;
          width: 100%;
          max-width: 480px;
          border-radius: 30px 30px 0 0;
          padding: 30px;
          transform: translateY(100%);
          transition: transform 0.3s;
        }
        
        .modal.active .modal-content {
          transform: translateY(0);
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          opacity: 0.8;
        }
        
        .form-input, .form-select {
          width: 100%;
          padding: 15px;
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          color: white;
          font-family: inherit;
          font-size: 16px;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .submit-btn {
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
        
        /* Notification */
        .notification {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%) translateY(-100px);
          background: #4ECDC4;
          color: white;
          padding: 15px 30px;
          border-radius: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          transition: transform 0.3s;
          z-index: 3000;
          font-weight: 500;
        }
        
        .notification.show {
          transform: translateX(-50%) translateY(0);
        }
      </style>
    </head>
    <body>
      <div class="app-container">
        <div class="header">
          <h1>📋 Mes Tâches</h1>
          <div class="subtitle">${activeTodos.length} active, ${completedTodos.length} terminées</div>
          
          <div class="search-container">
            <span class="search-icon">🔍</span>
            <form style="margin:0;" method="GET">
              <input type="text" name="search" class="search-input" placeholder="Rechercher..." value="${search}">
              <input type="hidden" name="category" value="${category}">
            </form>
          </div>
        </div>
        
        <div class="category-nav">
          ${categories.map(cat => `
            <a href="/?category=${cat}${search ? '&search='+encodeURIComponent(search) : ''}" 
               class="category-btn ${category === cat ? 'active' : ''}">
              ${cat}
            </a>
          `).join('')}
        </div>
        
        <div class="stats">
          <div class="progress-card">
            <div class="progress-header">
              <span>Progression</span>
              <span>${progress}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
          </div>
        </div>
        
        <div class="tasks-container">
          ${activeTodos.length > 0 ? `
            <div class="section-title">
              <span>À faire</span>
              <span class="drag-hint">👆 Glissez pour réorganiser</span>
            </div>
            <div id="active-tasks" class="sortable-list">
              ${activeTodos.map(todo => renderTask(todo)).join('')}
            </div>
          ` : ''}
          
          ${completedTodos.length > 0 ? `
            <div class="section-title" style="margin-top: 30px;">
              <span>✓ Terminées</span>
            </div>
            <div id="completed-tasks">
              ${completedTodos.map(todo => renderTask(todo)).join('')}
            </div>
          ` : ''}
          
          ${todos.length === 0 ? `
            <div style="text-align: center; padding: 60px 20px; opacity: 0.6;">
              <div style="font-size: 50px; margin-bottom: 20px;">📝</div>
              <div>Aucune tâche. Ajoutez-en une !</div>
            </div>
          ` : ''}
        </div>
      </div>
      
      <button class="fab" onclick="openModal()">+</button>
      
      <!-- Modal -->
      <div id="addModal" class="modal" onclick="if(event.target===this)closeModal()">
        <div class="modal-content">
          <h2 style="margin-bottom: 25px;">Nouvelle tâche</h2>
          <form action="/add" method="POST" id="addForm">
            <div class="form-group">
              <label class="form-label">Titre de la tâche</label>
              <input type="text" name="text" class="form-input" placeholder="Que devez-vous faire ?" required>
            </div>
            
            <div style="display: flex; gap: 15px;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Catégorie</label>
                <select name="category" class="form-select">
                  <option value="Personal">Personal</option>
                  <option value="Study">Study</option>
                  <option value="Important">Important</option>
                </select>
              </div>
              
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Priorité</label>
                <select name="priority" class="form-select">
                  <option value="High">High</option>
                  <option value="Medium" selected>Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Date d'échéance</label>
              <input type="datetime-local" name="dueDate" class="form-input" required>
            </div>
            
            <button type="submit" class="submit-btn">Créer la tâche</button>
          </form>
        </div>
      </div>
      
      <div id="notification" class="notification">Ordre sauvegardé !</div>

      <script>

    // ========== GESTION DU SERVICE WORKER & NOTIFICATIONS ==========
    let swRegistration = null;
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('SW enregistré:', reg);
          swRegistration = reg;
          requestNotificationPermission();
          startDeadlineChecker();
        })
        .catch(err => console.error('Erreur SW:', err));
    }
    
    function requestNotificationPermission() {
      if (!('Notification' in window)) return;
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Permission accordée');
        }
      });
    }
    
    function showNotification(title, body) {
      if (Notification.permission !== 'granted') return;
      const options = {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2098/2098402.png',
        tag: 'deadline-reminder'
      };
      if (swRegistration) {
        swRegistration.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
    }
    
    function startDeadlineChecker() {
      checkDeadlines();
      setInterval(checkDeadlines, 60000);
    }
    
    function checkDeadlines() {
      fetch('/api/todos')
        .then(res => res.json())
        .then(todos => {
          const now = new Date();
          todos.forEach(todo => {
            if (todo.completed || !todo.dueDate) return;
            const dueDate = new Date(todo.dueDate);
            const minutesLeft = Math.floor((dueDate - now) / 60000);
            if (minutesLeft > 0 && minutesLeft <= 15 && !localStorage.getItem('notified-' + todo.id)) {
              showNotification('⏰ Échéance imminente !', \`"\${todo.text}" dans \${minutesLeft} min\`);

              localStorage.setItem('notified-' + todo.id, 'true');
            }
          });
        })
        .catch(err => console.error('Erreur:', err));
    }
    
    // ========== MODAL & DRAG DROP ==========
    function openModal() {
      document.getElementById('addModal').classList.add('active');
      const now = new Date();
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
      const dateStr = now.toISOString().slice(0, 16);
      document.querySelector('input[name="dueDate"]').value = dateStr;
    }
    
    function closeModal() {
      document.getElementById('addModal').classList.remove('active');
    }
    
    // Drag & Drop
    document.addEventListener('DOMContentLoaded', function() {
      const list = document.getElementById('active-tasks');
      if (!list) return;
      let draggedItem = null;
      list.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('dragstart', function(e) {
          draggedItem = this;
          this.style.opacity = '0.5';
        });
        card.addEventListener('dragend', function() {
          this.style.opacity = '1';
          draggedItem = null;
          saveOrder();
        });
        card.addEventListener('dragover', function(e) {
          e.preventDefault();
          if (this === draggedItem) return;
          const rect = this.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          if (e.clientY < midpoint) {
            list.insertBefore(draggedItem, this);
          } else {
            list.insertBefore(draggedItem, this.nextSibling);
          }
        });
      });
      
      function saveOrder() {
        const cards = list.querySelectorAll('.task-card');
        const ids = Array.from(cards).map(c => c.getAttribute('data-id'));
        fetch('/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds: ids })
        });
      }
    });
        </script>
    </body>
    </html>
  `);
});

// Route API pour les notifications
app.get('/api/todos', (req, res) => {
  res.json(loadTodos());
});

app.post('/reorder', (req, res) => {
  const { orderedIds } = req.body;
  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'Données invalides' });
  }
  const todos = loadTodos();
  const todoMap = {};
  todos.forEach(t => todoMap[t.id] = t);
  const reorderedTodos = orderedIds.map(id => todoMap[id]).filter(Boolean);
  const remainingTodos = todos.filter(t => !orderedIds.includes(t.id));
  saveTodos([...reorderedTodos, ...remainingTodos]);
  res.json({ success: true });
});

app.post('/add', (req, res) => {
  const { text, category, priority, dueDate } = req.body;
  if (text && text.trim()) {
    const todos = loadTodos();
    todos.push({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      text: text.trim(),
      category: category || 'Personal',
      priority: priority || 'Medium',
      dueDate: dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    });
    saveTodos(todos);
  }
  res.redirect('/');
});

app.post('/toggle/:id', (req, res) => {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === req.params.id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos(todos);
  }
  res.redirect(req.get('Referer') || '/');
});

app.post('/delete/:id', (req, res) => {
  let todos = loadTodos();
  todos = todos.filter(t => t.id !== req.params.id);
  saveTodos(todos);
  res.redirect(req.get('Referer') || '/');
});

app.listen(3000, () => {
  console.log('✨ Serveur avec Notifications sur http://localhost:3000');
});
