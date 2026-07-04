import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Collection Token migration...");
  
  const collections = await prisma.collection.findMany();
  
  console.log(`Found ${collections.length} collections.`);
  
  for (const col of collections) {
    if (!col.collectionToken) {
      const collectionToken = crypto.randomBytes(8).toString("hex").toUpperCase();
      console.log(`Generating token "${collectionToken}" for collection "${col.title}"...`);
      await prisma.collection.update({
        where: { id: col.id },
        data: { collectionToken }
      });
    }
  }
  
  console.log("Migration complete!");
}

main()
  .catch(e => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
