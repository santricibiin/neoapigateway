import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@neo.ai";
  const password = process.env.ADMIN_PASS || "admin123";
  const hashed = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Super Admin",
      password: hashed,
      role: "admin",
    },
  });

  console.log("Admin created:", admin.email);

  const tokens = [
    { name: "Starter Pack", model: "GPT-4o Mini", price: 25000, stock: 100 },
    { name: "Pro Pack", model: "GPT-4o", price: 75000, stock: 50 },
    { name: "Claude Pack", model: "Claude 3.5 Sonnet", price: 90000, stock: 40 },
    { name: "Gemini Pack", model: "Gemini 1.5 Pro", price: 60000, stock: 60 },
  ];

  for (const t of tokens) {
    await prisma.token.upsert({
      where: { id: 0 },
      update: {},
      create: {
        name: t.name,
        model: t.model,
        price: t.price,
        stock: t.stock,
        sold: Math.floor(Math.random() * t.stock),
      },
    }).catch(() => {});
  }

  console.log("Tokens seeded:", tokens.length);

  const buyers = [
    "Andi", "Budi", "Citra", "Dewi", "Eka", "Fajar", "Gita", "Hadi",
  ];
  const statuses = ["success", "success", "success", "pending", "failed"];

  for (let i = 0; i < 30; i++) {
    const tokenRecords = await prisma.token.findMany();
    const randomToken = tokenRecords[Math.floor(Math.random() * tokenRecords.length)];
    const buyer = buyers[Math.floor(Math.random() * buyers.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const daysAgo = Math.floor(Math.random() * 30);

    await prisma.transaction.create({
      data: {
        buyerName: buyer,
        buyerEmail: `${buyer.toLowerCase()}@mail.com`,
        tokenId: randomToken.id,
        amount: randomToken.price,
        status,
        createdAt: new Date(Date.now() - daysAgo * 86400000),
      },
    });
  }

  console.log("Transactions seeded: 30");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
