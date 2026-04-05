import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const commercialPackages = [
  // 5 Seasonings
  {
    name: "Meat Church Holy Cow",
    packageType: "SEASONING",
    isPublic: true,
    ingredients: "Salt, Spice, Dehydrated Garlic & Onion, Paprika",
    instructions: "Apply heavily to brisket and beef ribs. Let sweat for 15-30 minutes before firing."
  },
  {
    name: "Kosmos Q Cow Cover",
    packageType: "SEASONING",
    isPublic: true,
    ingredients: "Salt, Chili Pepper, Spices, Sugar, Garlic.",
    instructions: "Great for competition brisket bark. Layer with Texas Beef for maximum impact."
  },
  {
    name: "Killer Hogs The BBQ Rub",
    packageType: "SEASONING",
    isPublic: true,
    ingredients: "Brown Sugar, Salt, Spice, Paprika, Dehydrated Garlic/Onion",
    instructions: "The gold standard for Memphis style ribs and pork shoulder."
  },
  {
    name: "Hardcore Carnivore Black",
    packageType: "SEASONING",
    isPublic: true,
    ingredients: "Activated Charcoal, Salt, Garlic, Black Pepper",
    instructions: "Creates an instant jet-black bark. Use on brisket or steaks."
  },
  {
    name: "Sucklebusters Texas Brisket Rub",
    packageType: "SEASONING",
    isPublic: true,
    ingredients: "Sea Salt, Black Pepper, Garlic, Onion",
    instructions: "Classic Texas SPG profile with a kick. Perfect for low and slow."
  },

  // 5 Sauces
  {
    name: "Blues Hog Original",
    packageType: "SAUCE",
    isPublic: true,
    ingredients: "Brown sugar, Ketchup, ACV, Spices",
    instructions: "The winningest sauce in BBQ. Very sweet and thick. Cut with Tennessee Red 50/50 for ribs."
  },
  {
    name: "Blues Hog Tennessee Red",
    packageType: "SAUCE",
    isPublic: true,
    ingredients: "ACV, Tomato, Spices",
    instructions: "Thin, vinegar based sauce. Perfect for pulled pork or thinning out thicker glazes."
  },
  {
    name: "Kosmos Q Cherry Habanero",
    packageType: "SAUCE",
    isPublic: true,
    ingredients: "Cherry juice, Habanero pepper mash, Sugar, Tomato",
    instructions: "Sweet heat. Incredible glaze for competition chicken thighs."
  },
  {
    name: "Meat Mitch Whomp!",
    packageType: "SAUCE",
    isPublic: true,
    ingredients: "Apple cider vinegar, Sugar, Tomato paste, Spices",
    instructions: "Award-winning Kansas City style sauce. Great on everything."
  },
  {
    name: "Sweet Baby Ray's",
    packageType: "SAUCE",
    isPublic: true,
    ingredients: "HFCS, Tomato paste, Vinegar, Smoke flavor",
    instructions: "The backyard classic. A solid baseline for practice cooks."
  },

  // 5 Injections
  {
    name: "Butcher BBQ Prime Brisket Injection",
    packageType: "INJECTION",
    isPublic: true,
    ingredients: "Hydrolyzed vegetable protein, MSG, Beef flavor, Phosphates",
    instructions: "Mix 3/4 cup with 2 cups water. Inject in a 1-inch grid pattern across the flat."
  },
  {
    name: "Kosmos Q Reserve Blend Brisket",
    packageType: "INJECTION",
    isPublic: true,
    ingredients: "Beef Broth base, Phosphates, Spices",
    instructions: "The secret weapon for retaining moisture during the stall."
  },
  {
    name: "Butcher BBQ Pork Injection",
    packageType: "INJECTION",
    isPublic: true,
    ingredients: "Pork flavor base, MSG, Phosphates",
    instructions: "Mix with apple juice instead of water for competition pork butts."
  },
  {
    name: "Kosmos Q Pork Injection",
    packageType: "INJECTION",
    isPublic: true,
    ingredients: "Natural pork flavor, Brown sugar, Phosphates",
    instructions: "Inject into the money muscle heavily before resting overnight."
  },
  {
    name: "Oakridge BBQ Game Changer",
    packageType: "INJECTION",
    isPublic: true,
    ingredients: "Salt, Raw Cane Sugar, Spices",
    instructions: "Great all-purpose injection for chicken and pork."
  },

  // 5 Brines
  {
    name: "Kosmos Q Chicken Soak",
    packageType: "BRINE",
    isPublic: true,
    ingredients: "Salt, Sugar, Spices, Phosphates",
    instructions: "Mix 1 cup with 1/2 gallon water. Soak chicken thighs for exactly 4 hours for bite-through skin."
  },
  {
    name: "Meat Church Bird Bath",
    packageType: "BRINE",
    isPublic: true,
    ingredients: "Salt, Sugar, Spices",
    instructions: "Easy 2 hour soak for perfect competition poultry."
  },
  {
    name: "Heath Riles Chicken Injection/Brine",
    packageType: "BRINE",
    isPublic: true,
    ingredients: "Salt, Butter flavor, Spices",
    instructions: "Can be injected or soaked. Use as a brine for 4 hours."
  },
  {
    name: "Butcher BBQ Bird Booster",
    packageType: "BRINE",
    isPublic: true,
    ingredients: "Chicken flavor, MSG, Phosphates",
    instructions: "Technically an injection, but works amazingly well as a 2-hour soak for thighs."
  },
  {
    name: "Smokin Guns Gunpowder Brine",
    packageType: "BRINE",
    isPublic: true,
    ingredients: "Sea Salt, Spices, Garlic",
    instructions: "A robust, savory brine. Soak for 6 hours."
  }
];

async function main() {
  console.log('Start seeding commercial packages...')
  
  for (const pkg of commercialPackages) {
    const existing = await prisma.package.findFirst({
      where: { name: pkg.name }
    });

    if (!existing) {
      await prisma.package.create({
        data: pkg
      })
    }
  }

  console.log('Completed seeding 20 commercial BBQ products.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
