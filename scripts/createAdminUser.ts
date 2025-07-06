import prisma from '../src/prisma'; // ajuste o caminho conforme seu projeto
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

// URL da imagem dummy admin
const IMAGE_URL = 'https://png.pngtree.com/png-clipart/20230822/original/pngtree-anonymous-user-unknown-faceless-vector-picture-image_8173920.png';

// Função para baixar a imagem e salvar localmente
async function downloadImage(url: string, dest: string) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  return new Promise<void>((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function main() {
  const userName = 'admin';
  const email = 'admin@example.com';
  const dir = path.join('uploads', 'users', userName);
  fs.mkdirSync(dir, { recursive: true });
  const imagePath = path.join(dir, 'dummy.png');

  // Baixa a imagem se não existir
  if (!fs.existsSync(imagePath)) {
    console.log('Baixando imagem dummy admin...');
    await downloadImage(IMAGE_URL, imagePath);
    console.log('Imagem salva em:', imagePath);
  } else {
    console.log('Imagem dummy admin já existe localmente');
  }

  // Verifica se já existe usuário admin
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { name: userName }],
    },
  });

  if (existingUser) {
    console.log('Usuário admin já existe no banco');
    process.exit(0);
  }

  // Busca a role "admin"
  const role = await prisma.role.findUnique({
    where: { name: 'admin' },
  });

  if (!role) {
    throw new Error('Role "admin" não encontrada. Rode o seed de roles primeiro.');
  }

  // Cria hash da senha
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Salva o caminho relativo da imagem para o banco
  const relativeImagePath = path.join('uploads', 'users', userName, 'dummy.png').replace(/\\/g, '/');

  // Cria usuário admin
  const user = await prisma.user.create({
    data: {
      name: userName,
      email,
      phone: '0000000000',
      country: 'AdminLand',
      state: 'AdminState',
      city: 'AdminCity',
      password: hashedPassword,
      active: true,
      image: relativeImagePath,
      role: {
        connect: {
          id: role.id
        }
      }
    },
  });

  console.log('Usuário admin criado:', user);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
