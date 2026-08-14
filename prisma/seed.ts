import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const admin = await db.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Alex Admin",
      email: "admin@example.com",
      passwordHash: password,
      role: "ADMIN",
      phone: "555-0100",
    },
  });

  const dispatcher = await db.user.upsert({
    where: { email: "dispatch@example.com" },
    update: {},
    create: {
      name: "Dana Dispatcher",
      email: "dispatch@example.com",
      passwordHash: password,
      role: "DISPATCHER",
      phone: "555-0101",
    },
  });

  const tech1 = await db.user.upsert({
    where: { email: "tech1@example.com" },
    update: {},
    create: {
      name: "Terry Tech",
      email: "tech1@example.com",
      passwordHash: password,
      role: "TECH",
      phone: "555-0102",
    },
  });

  const tech2 = await db.user.upsert({
    where: { email: "tech2@example.com" },
    update: {},
    create: {
      name: "Jordan Journeyman",
      email: "tech2@example.com",
      passwordHash: password,
      role: "TECH",
      phone: "555-0103",
    },
  });

  const customer1 = await db.customer.create({
    data: {
      name: "Maria Gonzalez",
      email: "maria@example.com",
      phone: "555-0200",
      street: "123 Maple St",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      createdById: admin.id,
    },
  });

  const customer2 = await db.customer.create({
    data: {
      name: "Riverside Apartments",
      email: "manager@riverside-apts.example.com",
      phone: "555-0201",
      street: "800 Riverside Dr",
      city: "Springfield",
      state: "IL",
      zip: "62704",
      createdById: dispatcher.id,
    },
  });

  const now = new Date();
  const today9am = new Date(now);
  today9am.setHours(9, 0, 0, 0);
  const today11am = new Date(now);
  today11am.setHours(11, 0, 0, 0);
  const today1pm = new Date(now);
  today1pm.setHours(13, 0, 0, 0);
  const today3pm = new Date(now);
  today3pm.setHours(15, 0, 0, 0);

  await db.job.create({
    data: {
      title: "AC not cooling",
      description: "Unit runs but blows warm air.",
      customerId: customer1.id,
      assignments: { create: { userId: tech1.id } },
      status: "SCHEDULED",
      scheduledStart: today9am,
      scheduledEnd: today11am,
      street: customer1.street,
      city: customer1.city,
      state: customer1.state,
      zip: customer1.zip,
    },
  });

  await db.job.create({
    data: {
      title: "Annual furnace inspection",
      customerId: customer2.id,
      assignments: { create: { userId: tech2.id } },
      status: "SCHEDULED",
      scheduledStart: today1pm,
      scheduledEnd: today3pm,
      street: customer2.street,
      city: customer2.city,
      state: customer2.state,
      zip: customer2.zip,
    },
  });

  await db.job.create({
    data: {
      title: "Leaky kitchen faucet",
      customerId: customer1.id,
      status: "UNSCHEDULED",
      street: customer1.street,
      city: customer1.city,
      state: customer1.state,
      zip: customer1.zip,
    },
  });

  console.log("Seeded database with demo users, customers, and jobs.");
  console.log("Login with any of:");
  console.log("  admin@example.com / password123 (ADMIN)");
  console.log("  dispatch@example.com / password123 (DISPATCHER)");
  console.log("  tech1@example.com / password123 (TECH)");
  console.log("  tech2@example.com / password123 (TECH)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
