import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Creating or updating users...");

  // Create users
  const minh = await prisma.user.upsert({
    where: { id: "seed_minh" },
    update: {
      email: "minh@example.com",
      username: "minhdev",
      displayName: "Minh Nguyễn",
      bio: "Full-stack Developer 💻 | Love coding and coffee ☕",
      imageUrl: "https://ui-avatars.com/api/?name=Minh+Nguyen&background=0D8ABC&color=fff",
    },
    create: {
      id: "seed_minh",
      email: "minh@example.com",
      username: "minhdev",
      displayName: "Minh Nguyễn",
      bio: "Full-stack Developer 💻 | Love coding and coffee ☕",
      imageUrl: "https://ui-avatars.com/api/?name=Minh+Nguyen&background=0D8ABC&color=fff",
    },
  });

  const lan = await prisma.user.upsert({
    where: { id: "seed_lan" },
    update: {
      email: "lan@example.com",
      username: "landesigner",
      displayName: "Lan Phạm",
      bio: "UI/UX Designer ✨ | Making the web beautiful",
      imageUrl: "https://ui-avatars.com/api/?name=Lan+Pham&background=F97316&color=fff",
    },
    create: {
      id: "seed_lan",
      email: "lan@example.com",
      username: "landesigner",
      displayName: "Lan Phạm",
      bio: "UI/UX Designer ✨ | Making the web beautiful",
      imageUrl: "https://ui-avatars.com/api/?name=Lan+Pham&background=F97316&color=fff",
    },
  });

  const hung = await prisma.user.upsert({
    where: { id: "seed_hung" },
    update: {
      email: "hung@example.com",
      username: "hungtech",
      displayName: "Hùng Trần",
      bio: "Tech enthusiast 🚀 | AI & ML lover",
      imageUrl: "https://ui-avatars.com/api/?name=Hung+Tran&background=8B5CF6&color=fff",
    },
    create: {
      id: "seed_hung",
      email: "hung@example.com",
      username: "hungtech",
      displayName: "Hùng Trần",
      bio: "Tech enthusiast 🚀 | AI & ML lover",
      imageUrl: "https://ui-avatars.com/api/?name=Hung+Tran&background=8B5CF6&color=fff",
    },
  });

  const thao = await prisma.user.upsert({
    where: { id: "seed_thao" },
    update: {
      email: "thao@example.com",
      username: "thaonguyen",
      displayName: "Thảo Nguyễn",
      bio: "Product Manager | Building great products 📱",
      imageUrl: "https://ui-avatars.com/api/?name=Thao+Nguyen&background=EC4899&color=fff",
    },
    create: {
      id: "seed_thao",
      email: "thao@example.com",
      username: "thaonguyen",
      displayName: "Thảo Nguyễn",
      bio: "Product Manager | Building great products 📱",
      imageUrl: "https://ui-avatars.com/api/?name=Thao+Nguyen&background=EC4899&color=fff",
    },
  });

  const khanh = await prisma.user.upsert({
    where: { id: "seed_khanh" },
    update: {
      email: "khanh@example.com",
      username: "khanhcoder",
      displayName: "Khánh Lê",
      bio: "Backend Developer | Node.js & Go enthusiast 🔥",
      imageUrl: "https://ui-avatars.com/api/?name=Khanh+Le&background=10B981&color=fff",
    },
    create: {
      id: "seed_khanh",
      email: "khanh@example.com",
      username: "khanhcoder",
      displayName: "Khánh Lê",
      bio: "Backend Developer | Node.js & Go enthusiast 🔥",
      imageUrl: "https://ui-avatars.com/api/?name=Khanh+Le&background=10B981&color=fff",
    },
  });

  console.log("Creating follows...");

  // Create follow relationships
  await prisma.follow.createMany({
    data: [
      { followerId: minh.id, followingId: lan.id },
      { followerId: minh.id, followingId: hung.id },
      { followerId: lan.id, followingId: minh.id },
      { followerId: lan.id, followingId: thao.id },
      { followerId: hung.id, followingId: minh.id },
      { followerId: hung.id, followingId: khanh.id },
      { followerId: thao.id, followingId: lan.id },
      { followerId: khanh.id, followingId: minh.id },
    ],
    skipDuplicates: true,
  });

  console.log("Creating posts...");

  // Create posts
  const post1 = await prisma.post.create({
    data: {
      authorId: minh.id,
      content: "Mình vừa hoàn thành dự án Paper với React + Node.js! 🎉 Ai có kinh nghiệm về real-time notifications thì share cho mình với nhé!",
      likeCount: 15,
      commentCount: 5,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      authorId: lan.id,
      content: "Những nguyên tắc thiết kế UI/UX mà mọi developer nên biết:\n\n1. Consistency is key 🔑\n2. Less is more ✨\n3. User feedback matters 💬\n4. Accessibility first ♿\n\nBạn còn bổ sung gì nữa không?",
      likeCount: 23,
      commentCount: 8,
    },
  });

  const post3 = await prisma.post.create({
    data: {
      authorId: hung.id,
      content: "Hôm nay mình học được một trick hay về TypeScript generics. Code clean hơn hẳn! 💪\n\nCác bạn có tips nào về TypeScript không, share nhé!",
      likeCount: 12,
      commentCount: 4,
    },
  });

  const post4 = await prisma.post.create({
    data: {
      authorId: thao.id,
      content: "Meeting marathon today 😅 7 meetings liên tiếp. Ai có tips để stay productive trong những ngày như này không?",
      likeCount: 18,
      commentCount: 6,
    },
  });

  const post5 = await prisma.post.create({
    data: {
      authorId: khanh.id,
      content: "Prisma vs TypeORM - cuộc chiến ORM nào xứng đáng hơn? 🤔\n\nMình đang dùng Prisma và thấy khá ổn. Các bạn thì sao?",
      likeCount: 20,
      commentCount: 10,
    },
  });

  const post6 = await prisma.post.create({
    data: {
      authorId: minh.id,
      content: "Coffee break ☕ Đang brainstorm ideas cho feature mới. Cuối tuần này sẽ ship!",
      likeCount: 8,
      commentCount: 2,
    },
  });

  const post7 = await prisma.post.create({
    data: {
      authorId: lan.id,
      content: "Figma tips: Dùng Auto Layout + Variants = 🚀\n\nComponent library của bạn sẽ flexible và maintainable hơn rất nhiều!",
      likeCount: 25,
      commentCount: 7,
    },
  });

  console.log("Creating comments...");

  // Create comments
  const comment1 = await prisma.comment.create({
    data: {
      postId: post1.id,
      authorId: lan.id,
      content: "Chúc mừng bạn! Mình suggest dùng Socket.io cho real-time, khá stable đấy 👍",
      likeCount: 5,
    },
  });

  const comment2 = await prisma.comment.create({
    data: {
      postId: post1.id,
      authorId: khanh.id,
      content: "Mình đang dùng WebSocket với Redis pub/sub, scale tốt lắm bạn ơi!",
      likeCount: 3,
    },
  });

  // Reply to comment
  await prisma.comment.create({
    data: {
      postId: post1.id,
      authorId: minh.id,
      parentId: comment1.id,
      content: "Thanks Lan! Mình sẽ thử Socket.io xem sao 😊",
      likeCount: 1,
    },
  });

  await prisma.comment.create({
    data: {
      postId: post2.id,
      authorId: minh.id,
      content: "Rất đồng ý với accessibility! Nhiều dev hay bỏ qua phần này quá",
      likeCount: 4,
    },
  });

  await prisma.comment.create({
    data: {
      postId: post2.id,
      authorId: hung.id,
      content: "Mình thêm: Dark mode support! User ngày nay expect điều này 🌙",
      likeCount: 6,
    },
  });

  await prisma.comment.create({
    data: {
      postId: post3.id,
      authorId: khanh.id,
      content: "TypeScript generics là game changer thật! Mình cũng vừa học được utility types khá hay",
      likeCount: 2,
    },
  });

  await prisma.comment.create({
    data: {
      postId: post4.id,
      authorId: minh.id,
      content: "Time blocking là key! Mình schedule break time giữa các meetings để recharge 🔋",
      likeCount: 3,
    },
  });

  await prisma.comment.create({
    data: {
      postId: post5.id,
      authorId: minh.id,
      content: "Prisma DX tốt hơn nhiều! Type safety + migration tool rất smooth",
      likeCount: 5,
    },
  });

  await prisma.comment.create({
    data: {
      postId: post5.id,
      authorId: hung.id,
      content: "TypeORM flexible hơn với raw queries, nhưng Prisma thì dev speed nhanh hơn 🏃",
      likeCount: 4,
    },
  });

  console.log("Creating likes...");

  // Create likes for posts
  await prisma.like.createMany({
    data: [
      // Post 1 likes
      { userId: lan.id, postId: post1.id },
      { userId: hung.id, postId: post1.id },
      { userId: thao.id, postId: post1.id },
      { userId: khanh.id, postId: post1.id },

      // Post 2 likes
      { userId: minh.id, postId: post2.id },
      { userId: hung.id, postId: post2.id },
      { userId: thao.id, postId: post2.id },
      { userId: khanh.id, postId: post2.id },

      // Post 3 likes
      { userId: minh.id, postId: post3.id },
      { userId: lan.id, postId: post3.id },
      { userId: khanh.id, postId: post3.id },

      // Post 4 likes
      { userId: minh.id, postId: post4.id },
      { userId: lan.id, postId: post4.id },
      { userId: hung.id, postId: post4.id },

      // Post 5 likes
      { userId: minh.id, postId: post5.id },
      { userId: lan.id, postId: post5.id },
      { userId: hung.id, postId: post5.id },
      { userId: thao.id, postId: post5.id },

      // Post 6 likes
      { userId: lan.id, postId: post6.id },
      { userId: hung.id, postId: post6.id },

      // Post 7 likes
      { userId: minh.id, postId: post7.id },
      { userId: hung.id, postId: post7.id },
      { userId: thao.id, postId: post7.id },
      { userId: khanh.id, postId: post7.id },
    ],
  });

  // Create likes for comments
  await prisma.like.createMany({
    data: [
      { userId: minh.id, commentId: comment1.id },
      { userId: hung.id, commentId: comment1.id },
      { userId: minh.id, commentId: comment2.id },
    ],
  });

  console.log("Creating notifications...");

  console.log("Creating reposts...");

  await prisma.repost.createMany({
    data: [
      {
        userId: minh.id,
        postId: post2.id,
      },
      {
        userId: lan.id,
        postId: post3.id,
      },
      {
        userId: hung.id,
        postId: post1.id,
      },
    ],
  });

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        recipientId: minh.id,
        actorId: lan.id,
        type: "FOLLOW",
      },
      {
        recipientId: minh.id,
        actorId: hung.id,
        type: "LIKE_POST",
        postId: post1.id,
      },
      {
        recipientId: minh.id,
        actorId: lan.id,
        type: "COMMENT",
        postId: post1.id,
        commentId: comment1.id,
      },
      {
        recipientId: lan.id,
        actorId: minh.id,
        type: "LIKE_POST",
        postId: post2.id,
      },
      {
        recipientId: lan.id,
        actorId: minh.id,
        type: "FOLLOW",
        isRead: true,
      },
    ],
  });

  console.log("✅ Seed completed successfully!");
  console.log(`📊 Created:`);
  console.log(`   - 5 users`);
  console.log(`   - 7 posts`);
  console.log(`   - 9 comments (including 1 reply)`);
  console.log(`   - 8 follow relationships`);
  console.log(`   - 27 likes (posts + comments)`);
  console.log(`   - 5 notifications`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
