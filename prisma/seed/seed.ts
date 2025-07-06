import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de roles...');

  // Cria roles admin e normal (pula se já existir)
  await prisma.role.createMany({
    data: [
      { name: 'admin' },
      { name: 'normal' },
    ],
    skipDuplicates: true,
  });

  // Busca a role normal para associar aos usuários
  const normalRole = await prisma.role.findUnique({
    where: { name: 'normal' },
  });

  if (!normalRole) {
    throw new Error('Role "normal" não encontrada');
  }

  console.log('Iniciando seed de usuários...');

  for (let i = 0; i < 40; i++) {
    const imageUrl = `https://picsum.photos/seed/user${i}/600/600`;

    await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number({style:'national'}), // ex: 123-456-7890
        country: faker.location.country(),
        state: faker.location.state(),
        city: faker.location.city(),
        active: faker.datatype.boolean(),
        password: faker.internet.password(),
        image: imageUrl,
        roleId: normalRole.id,
      },
    });
  }

  console.log('Seed finalizada: 40 usuários criados com imagem e role normal.');
}

main()
  .catch((e) => {
    console.error('Erro na seed:', e);
    // process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
