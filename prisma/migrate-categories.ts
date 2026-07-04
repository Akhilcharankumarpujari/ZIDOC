import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Category data migration...");
  
  // Find all collections that have requirements
  const collections = await prisma.collection.findMany({
    include: {
      requirements: true,
      categories: true,
    }
  });
  
  console.log(`Found ${collections.length} collections.`);
  
  for (const col of collections) {
    const orphanedReqs = col.requirements.filter(req => !req.categoryId);
    
    if (orphanedReqs.length > 0) {
      console.log(`Collection "${col.title}" has ${orphanedReqs.length} requirements directly under it. Migrating...`);
      
      // Check if a "General" category already exists for this collection
      let generalCategory = col.categories.find(c => c.name === "General");
      
      if (!generalCategory) {
        console.log(`Creating "General" category for collection "${col.title}"...`);
        generalCategory = await prisma.category.create({
          data: {
            collectionId: col.id,
            name: "General",
            description: "Default category for existing requirements.",
            sortOrder: 0,
          }
        });
      }
      
      // Update requirements to point to the General category
      for (const req of orphanedReqs) {
        await prisma.requirement.update({
          where: { id: req.id },
          data: {
            categoryId: generalCategory.id,
          }
        });
        console.log(`Updated requirement "${req.title}" -> category "General".`);
      }
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
