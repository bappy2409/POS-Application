import 'dotenv/config';
import bcrypt from 'bcrypt';

import prisma from '../src/lib/prisma.js';

const [email, firstName, lastName] = process.argv.slice(2);
const password = process.env.OWNER_PASSWORD;

if (!email || !password || !firstName || !lastName) {
  console.error('Usage: OWNER_PASSWORD=<password> pnpm --filter server create:owner <email> <firstName> <lastName>');
  process.exitCode = 1;
} else if (password.length < 12) {
  console.error('Password must be at least 12 characters.');
  process.exitCode = 1;
} else {
  try {
    const existingOwner = await prisma.user.findFirst({ where: { role: 'owner' } });
    if (existingOwner) throw new Error('An owner account already exists; use an existing owner to create staff.');

    const owner = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        passwordHash: await bcrypt.hash(password, 12),
        role: 'owner',
      },
    });
    console.log(`Created owner account for ${owner.email}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
