import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import prisma from '../prisma';
import sanitize from 'sanitize-filename';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Schema Zod para criação de usuário
const userCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  country: z.string().min(1, 'País é obrigatório'),
  state: z.string().min(1, 'Estado é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  active: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional()
    .default(true),
});

// Config multer para upload de imagem
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const rawUserName = req.body.name;
    const userName = sanitize(rawUserName);
    if (!userName) {
      return cb(new Error('Nome do usuário é obrigatório para definir pasta'), '');
    }
    const dir = path.join('uploads', 'users', userName);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}${ext}`;
    cb(null, filename);
  },
});
const upload = multer({ storage });

// ROTA PÚBLICA - Criar usuário
router.post('/create', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const validation = userCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten().fieldErrors });
    }

    const { name, email, phone, country, state, city, password, active } = validation.data;

    if (!req.file) {
      return res.status(400).json({ error: 'Imagem é obrigatória' });
    }

    // Validações únicas
    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    if (await prisma.user.findUnique({ where: { name } })) {
      return res.status(409).json({ error: 'Usuário já cadastrado' });
    }
    if (await prisma.user.findUnique({ where: { phone } })) {
      return res.status(409).json({ error: 'Telefone já cadastrado com outro usuário' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const imagePath = req.file.path;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        country,
        state,
        city,
        password: hashedPassword,
        active,
        image: imagePath,
      },
    });

    const { password: _password, ...userWithoutPassword } = user;
    return res.status(201).json(userWithoutPassword);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// ROTA PÚBLICA - Login (gera JWT)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { emailOrName, password } = req.body;
    if (!emailOrName || !password) {
      return res.status(400).json({ error: 'Email ou nome e senha são obrigatórios' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrName },
          { name: emailOrName },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    const { password: _password, ...userWithoutPassword } = user;
    return res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao autenticar usuário' });
  }
});

// Middleware para proteger as rotas abaixo
router.use(authenticateToken);

// ROTA PROTEGIDA - Listar todos usuários (sem senha)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    const usersWithoutPassword = users.map(({ password, ...rest }) => rest);
    return res.json(usersWithoutPassword);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// ROTA PROTEGIDA - Buscar usuário por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID inválido' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { password: _password, ...userWithoutPassword } = user;
    return res.json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// ROTA PROTEGIDA - Atualizar usuário
router.put('/:id', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID inválido' });

    const { name, email, phone, country, state, city, password, active } = req.body;

    const dataToUpdate: any = {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(country && { country }),
      ...(state && { state }),
      ...(city && { city }),
      ...(typeof active !== 'undefined' && { active: active === 'true' || active === true }),
    };

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    if (req.file) {
      dataToUpdate.image = req.file.path;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    const { password: _password, ...userWithoutPassword } = updatedUser;
    return res.json(userWithoutPassword);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// ROTA PROTEGIDA - Ativar/Desativar usuário
router.patch('/:id/active', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID inválido' });

    const { active } = req.body;
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Campo active deve ser booleano' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { active },
    });

    const { password: _password, ...userWithoutPassword } = updatedUser;
    return res.json(userWithoutPassword);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

export default router;
