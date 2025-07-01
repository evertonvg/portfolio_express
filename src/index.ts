import express from 'express';
import usersRouter from './routes/users';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // libera só essa origem
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], // métodos liberados
  credentials: true, // se precisar enviar cookies/autenticação
}));

app.use(express.json());

app.use('/users', usersRouter);

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
