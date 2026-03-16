import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const alice = await prisma.user.upsert({
    where: { id: "seed_alice" },
    update: {
      email: "alice@example.com",
      username: "alice",
      displayName: "Alice",
      bio: "Seed user Alice",
    },
    create: {
      id: "seed_alice",
      email: "alice@example.com",
      username: "alice",
      displayName: "Alice",
      bio: "Seed user Alice",
    },
  });

  const bob = await prisma.user.upsert({
    where: { id: "seed_bob" },
    update: {
      email: "bob@example.com",
      username: "bob",
      displayName: "Bob",
      bio: "Seed user Bob",
    },
    create: {
      id: "seed_bob",
      email: "bob@example.com",
      username: "bob",
      displayName: "Bob",
      bio: "Seed user Bob",
    },
  });

  await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId: alice.id,
        followingId: bob.id,
      },
    },
    update: {},
    create: {
      followerId: alice.id,
      followingId: bob.id,
    },
  });

  await prisma.post.create({
    data: {
      authorId: bob.id,
      content: "Hello from seed data",
      imageUrls: [],
    },
  });

  console.log("Seed completed successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
