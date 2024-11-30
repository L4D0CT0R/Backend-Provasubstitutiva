const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http'); // Importa o módulo http
const { Server } = require('socket.io'); // Importa o Socket.IO
const app = express();
const PORT = 3000;
const SECRET_KEY = 'sua_chave_secreta';
const moment = require('moment-timezone');
app.use(express.json());
app.use(cors());
// Configura o servidor HTTP
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Habilita CORS para qualquer origem
        methods: ['GET', 'POST'],
    }
});
// Função para inserir dados no banco e disparar evento
async function addSensorData(newData) {
    // Gerando o timestamp no fuso horário correto
    const timestamp = moment().tz('America/Sao_Paulo').format('YYYY-MM-DD HH:mm:ss');
    
    // Insira no banco de dados com o timestamp ajustado
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO dados_sensores (sensor_id, temperatura, umidade, timestamp) VALUES (?, ?, ?, ?)`,
            [newData.sensor_id, newData.temperatura, newData.umidade, timestamp],
            (err) => {
                if (err) {
                    return reject(err); // Se houver erro, rejeita a promessa
                }
                console.log('Dados inseridos no banco de dados com sucesso.');
                io.emit('sensorDataUpdate', newData); // Emitindo os dados atualizados
                resolve(); // Se tudo correr bem, resolve a promessa
            });
    });
}
// Escuta a conexão de clientes
io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});
// Função para gerar valores aleatórios de temperatura e umidade
function gerarDadosAleatorios(sensorId, estado) {
    // Temperatura entre 15°C e 35°C
    const temperatura = (Math.random() * (35 - 15) + 15).toFixed(2);
    // Umidade entre 40% e 90%
    const umidade = (Math.random() * (90 - 40) + 40).toFixed(2);
    const dados = {
        sensor_id: sensorId,
        estado: estado,
        temperatura: parseFloat(temperatura),
        umidade: parseFloat(umidade),
    };
    return dados;
}
// Simulando 5 sensores para estados específicos
const sensores = [
    { id: 1, estado: 'SP' },
    { id: 2, estado: 'RJ' },
    { id: 3, estado: 'MG' },
    { id: 4, estado: 'SC' },
    { id: 5, estado: 'BA' },
];
// Emitir dados a cada 30 segundos
setInterval(() => {
    sensores.forEach((sensor) => {
        const dadosAleatorios = gerarDadosAleatorios(sensor.id, sensor.estado);
        console.log(`Enviando dados para o sensor ${sensor.id} (${sensor.estado})`);
        
        // Emitir dados via Socket.IO
        io.emit('sensorDataUpdate', dadosAleatorios);

        // Enviar dados para o backend para inserção no banco de dados
        fetchDataToBackend(dadosAleatorios);
    });
}, 30000); // Intervalo de 30 segundos

// Função para enviar dados para o backend (inserir no banco)
function fetchDataToBackend(dados) {
    fetch('http://localhost:3000/dados-sensores', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
    })
    .then(response => response.json())
    .then(data => console.log('Dados enviados para o backend com sucesso:', data))
    .catch(error => console.error('Erro ao enviar dados para o backend:', error));
}
// Banco de dados e rotas (o restante do código permanece o mesmo)
const db = new sqlite3.Database('banco-de-dados.db');
// Criação das tabelas (o código permanece o mesmo)
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS dados_sensores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id INTEGER,
        temperatura REAL,
        umidade REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});
// Rota para cadastrar um novo usuário
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Verificar se o usuário já existe
        db.get('SELECT * FROM usuarios WHERE username = ?', [username], async (err, row) => {
            if (row) {
                return res.status(400).json({ message: 'Usuário já existe' });
            }
            // Criptografar a senha
            const hashedPassword = await bcrypt.hash(password, 10);
            // Inserir o novo usuário na tabela
            db.run('INSERT INTO usuarios (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
                if (err) {
                    console.error('Erro ao cadastrar usuário:', err.message);
                    return res.status(500).json({ message: 'Erro ao cadastrar usuário' });
                }
                res.status(201).json({ message: 'Usuário cadastrado com sucesso' });
            });
        });
    } catch (err) {
        console.error('Erro ao processar o cadastro:', err.message);
        res.status(500).json({ message: 'Erro ao processar o cadastro' });
    }
});
// Rota para login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Verificar se o usuário existe
    db.get('SELECT * FROM usuarios WHERE username = ?', [username], async (err, row) => {
        if (!row) {
            return res.status(400).json({ message: 'Usuário ou senha incorretos' });
        }
        // Verificar a senha
        const isPasswordValid = await bcrypt.compare(password, row.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Usuário ou senha incorretos' });
        }
        // Gerar o token JWT
        const token = jwt.sign({ userId: row.id }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ message: 'Login realizado com sucesso', token });
    });
});
// Middleware para verificar o token JWT
const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (token) {
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Acesso negado' });
            }
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ message: 'Token não fornecido' });
    }
};
// Rota para buscar todos os dados dos sensores (protegida por JWT)
app.get('/dados-sensores', authenticateJWT, (req, res) => {
    const query = `SELECT * FROM dados_sensores`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar dados no banco de dados:', err.message);
            res.status(500).send('Erro ao buscar os dados.');
        } else {
            res.json(rows);
        }
    });
});
// Rota para buscar dados dos sensores em um intervalo de tempo (protegida por JWT)
app.get('/dados-sensores/tempo', authenticateJWT, (req, res) => {
    const { inicio, fim } = req.query; // Espera que os parâmetros sejam passados na URL
    if (!inicio || !fim) {
        return res.status(400).json({ message: 'Os parâmetros de data "inicio" e "fim" são obrigatórios.' });
    }
    const query = `SELECT * FROM dados_sensores WHERE timestamp BETWEEN ? AND ?`;
    db.all(query, [inicio, fim], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar dados no banco de dados:', err.message);
            res.status(500).send('Erro ao buscar os dados.');
        } else {
            res.json(rows);
        }
    });
});
// Rota para inserir dados dos sensores
app.post('/dados-sensores', async (req, res) => {
    const dados = req.body;
    console.log('Dados recebidos dos sensores:', dados);

    // Verifica se os dados estão completos
    if (!dados.sensor_id || !dados.temperatura || !dados.umidade) {
        return res.status(400).json({ message: 'Dados incompletos' });
    }

    try {
        await addSensorData(dados); // Chama a função para inserir dados no banco e emitir evento
        res.json({ message: 'Dados recebidos e armazenados com sucesso.' }); // Usando res.json() para enviar resposta JSON
    } catch (err) {
        console.error('Erro ao inserir dados no banco de dados:', err.message);
        res.status(500).json({ message: 'Erro ao processar os dados.' });
    }
});
// Função para inserir dados no banco e disparar evento
async function addSensorData(newData) {
    // Insira no banco de dados
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO dados_sensores (sensor_id, temperatura, umidade) VALUES (?, ?, ?)`,
            [newData.sensor_id, newData.temperatura, newData.umidade],
            (err) => {
                if (err) {
                    return reject(err); // Se houver erro, rejeita a promessa
                }
                console.log('Dados inseridos no banco de dados com sucesso.');
                io.emit('sensorDataUpdate', newData); // Emitindo os dados atualizados
                resolve(); // Se tudo correr bem, resolve a promessa
            });
    });
}
// Rota para limpar todos os dados da tabela (protegida por JWT)
app.delete('/limpar-dados', (req, res) => {
    const query = `DELETE FROM dados_sensores`;
    db.run(query, [], (err) => {
        if (err) {
            console.error('Erro ao limpar dados do banco de dados:', err.message);
            res.status(500).send('Erro ao limpar os dados.');
        } else {
            console.log('Dados da tabela limpos com sucesso.');
            res.send('Dados da tabela foram limpos com sucesso.');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});