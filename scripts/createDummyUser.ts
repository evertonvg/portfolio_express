import prisma from '../src/prisma';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

// URL da imagem dummy
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
  const userName = 'dummyuser';
  const dir = path.join('uploads', 'users', userName);
  fs.mkdirSync(dir, { recursive: true });
  const imagePath = path.join(dir, 'dummy.png');

  // Baixa a imagem se não existir
  if (!fs.existsSync(imagePath)) {
    console.log('Baixando imagem dummy...');
    await downloadImage(IMAGE_URL, imagePath);
    console.log('Imagem salva em:', imagePath);
  } else {
    console.log('Imagem dummy já existe localmente');
  }

  // Verifica se já existe usuário com email ou nome dummy
  const email = 'dummyuser@example.com';
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { name: userName }],
    },
  });

  if (existingUser) {
    console.log('Usuário dummy já existe no banco');
    process.exit(0);
  }

  // Cria usuário dummy com senha "123456"
  const hashedPassword = await bcrypt.hash('123456', 10);

  const user = await prisma.user.create({
    data: {
      name: userName,
      email,
      phone: '0000000000',
      country: 'DummyLand',
      state: 'DummyState',
      city: 'DummyCity',
      password: hashedPassword,
      active: true,
      image: imagePath,
    },
  });

  console.log('Usuário dummy criado:', user);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
