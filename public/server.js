// 1. Importar os pacotes que instalamos
const express = require('express');
const sqlite3 = require('sqlite3').verbose(); // .verbose() dá mais informações de erro

// 2. Configurar o servidor
const app = express();
const PORT = 3000; // A porta onde nosso servidor vai rodar

// 3. Conectar ao nosso banco de dados (a "despensa")
// Se o arquivo não existir, o SQLite vai criá-lo automaticamente.
const db = new sqlite3.Database('./leaderboard.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Conectado ao banco de dados leaderboard.db');
});

// 4. Criar a tabela de pontuações, se ela ainda não existir
// `db.serialize` garante que os comandos dentro rodem um de cada vez
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    score INTEGER NOT NULL
  )`);
});

// 5. Configurações extras para o servidor entender JSON e servir arquivos
app.use(express.json()); // Permite que o servidor entenda dados em JSON
app.use(express.static('public')); // Serve os arquivos da pasta 'public' (onde está nosso index.html)


// ==================
// 6. AS ROTAS DA API (os "pedidos" que a cozinha sabe fazer)
// ==================

// Rota para BUSCAR o leaderboard
app.get('/api/leaderboard', (req, res) => {
  const sql = `SELECT nickname, score FROM scores ORDER BY score DESC LIMIT 5`; // Pega os 5 melhores
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).send({ error: err.message });
      return;
    }
    res.json(rows); // Devolve a lista de pontuações
  });
});

// Rota para ENVIAR uma nova pontuação
app.post('/api/submit-score', (req, res) => {
  const { nickname, score } = req.body;

  if (!nickname || score === undefined) {
    return res.status(400).send({ error: 'Nickname e score são obrigatórios.' });
  }

  // Primeiro, vamos ver se o jogador já tem uma pontuação salva
  const findSql = `SELECT score FROM scores WHERE nickname = ?`;

  db.get(findSql, [nickname], (err, row) => {
    if (err) {
      return res.status(500).send({ error: err.message });
    }

    if (row) {
      // O jogador existe. Só atualizamos se a nova pontuação for maior.
      if (score > row.score) {
        const updateSql = `UPDATE scores SET score = ? WHERE nickname = ?`;
        db.run(updateSql, [score, nickname], (err) => {
            if (err) return res.status(500).send({ error: err.message });
            res.send({ status: 'success', message: 'Pontuação atualizada!' });
        });
      } else {
        res.send({ status: 'success', message: 'Pontuação antiga era maior.' });
      }
    } else {
      // O jogador não existe, então inserimos a nova pontuação.
      const insertSql = `INSERT INTO scores (nickname, score) VALUES (?, ?)`;
      db.run(insertSql, [nickname, score], (err) => {
          if (err) return res.status(500).send({ error: err.message });
          res.send({ status: 'success', message: 'Pontuação salva!' });
      });
    }
  });
});


// 7. Iniciar o servidor para que ele comece a "ouvir" os pedidos
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
