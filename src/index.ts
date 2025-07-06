import express from 'express';
import usersRouter from './routes/users';
import cors from 'cors';
import path from 'path';

const app = express();

// CORS configurado
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

// 👇 Serve arquivos estáticos da pasta "uploads"
// A URL será: http://localhost:3333/uploads/...
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rotas de usuários
app.use('/users', usersRouter);

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
