import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

// Pre-computed bcrypt hash for the password "password123" — every seeded account uses this
const PASSWORD_HASH =
  "$2b$10$Bv.KAx6kDylKnXpCfC72gu/Z58yqSIFnkCTXVokRh77LZy9/1t37.";

async function main() {
  console.log("Seeding...");

  const host = await prisma.user.upsert({
    where: { email: "host@planam.test" },
    update: {},
    create: {
      email: "host@planam.test",
      password: PASSWORD_HASH,
      fullName: "Tola Adebayo",
      role: "HOST",
      phone: "08012345678",
    },
  });

  const vendorUser = await prisma.user.upsert({
    where: { email: "vendor@planam.test" },
    update: {},
    create: {
      email: "vendor@planam.test",
      password: PASSWORD_HASH,
      fullName: "Maria Ogunfolu",
      role: "VENDOR",
      phone: "08087654321",
    },
  });

  const vendorProfile = await prisma.vendorProfile.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      businessName: "Maria's Catering Co.",
      category: "CATERING",
      bio: "Premium catering for weddings and corporate events",
      yearsOfExperience: "3-5 years",
      serviceAreas: ["Lagos", "Abuja"],
      serviceType: "Full Event Coverage",
      pricingStructure: "FIXED_PACKAGE",
      minPrice: 500000,
      maxPrice: 3000000,
      pastEventTypes: ["WEDDING", "CORPORATE_EVENT"],
      isVerified: true,
    },
  });

  const goldPackage = await prisma.vendorPackage.create({
    data: {
      vendorProfileId: vendorProfile.id,
      name: "Gold Package",
      serviceDurationHours: 8,
      guestCapacity: 300,
      includes: [
        "8-hour service duration",
        "Buffet service for 300 guests",
        "10 serving staff",
        "Basic table setup included",
      ],
      basePrice: 1200000,
    },
  });

  const menuItems = await prisma.$transaction([
    prisma.menuItem.create({
      data: {
        vendorProfileId: vendorProfile.id,
        category: "PROTEIN",
        name: "Grilled Chicken",
      },
    }),
    prisma.menuItem.create({
      data: {
        vendorProfileId: vendorProfile.id,
        category: "MAIN_DISH",
        name: "Jollof Rice with Grilled Chicken",
      },
    }),
    prisma.menuItem.create({
      data: {
        vendorProfileId: vendorProfile.id,
        category: "SIDE",
        name: "Coleslaw",
      },
    }),
    prisma.menuItem.create({
      data: {
        vendorProfileId: vendorProfile.id,
        category: "DESSERT",
        name: "Fruit Salad",
      },
    }),
  ]);

  const liveGrillAddOn = await prisma.vendorAddOn.create({
    data: {
      vendorProfileId: vendorProfile.id,
      name: "Live grill station",
      price: 200000,
    },
  });

  const event = await prisma.event.create({
    data: {
      hostId: host.id,
      title: "Ade & Tola Wedding",
      eventType: "WEDDING",
      eventDate: new Date("2026-12-12"),
      location: "Lekki, Lagos",
      guestCapacity: 320,
      budget: 2500000,
      status: "CONFIRMED",
    },
  });

  const lead = await prisma.lead.create({
    data: {
      eventId: event.id,
      vendorProfileId: vendorProfile.id,
      status: "ACCEPTED",
      message: "We are looking for a caterer experienced with large weddings.",
    },
  });

  const quotation = await prisma.quotation.create({
    data: {
      leadId: lead.id,
      lineItems: [
        { description: "Wedding Catering Package", amount: 1200000 },
        { description: "Live Grilling Station", amount: 200000 },
        { description: "Dessert Table", amount: 150000 },
      ],
      subtotal: 1550000,
      taxRate: 10,
      taxAmount: 155000,
      totalAmount: 1705000,
      status: "ACCEPTED",
      terms: "50% deposit required to confirm booking",
    },
  });

  const booking = await prisma.booking.upsert({
    where: { quotationId: quotation.id },
    update: {},
    create: {
      eventId: event.id,
      vendorProfileId: vendorProfile.id,
      quotationId: quotation.id,
      confirmedAmount: quotation.totalAmount,
      status: "CONFIRMED",
      packageId: goldPackage.id,
      guestCount: 320,
      venue: "Lekki, Lagos",
      serviceDurationHours: 8,
    },
  });

  await prisma.faq.createMany({
    data: [
      {
        question: "How do I create an invoice?",
        answer:
          'Go to a confirmed booking and select "Generate Invoice" to create a deposit or balance invoice.',
        order: 1,
      },
      {
        question: "Why is my vendor profile not visible?",
        answer:
          'Your profile must be verified and have "Accepting Bookings" turned on to appear in search.',
        order: 2,
      },
      {
        question: "How do I change my account email?",
        answer:
          "Email changes are not yet self-service — contact support to update your account email.",
        order: 3,
      },
      {
        question: "What happens when a transaction is cancelled?",
        answer:
          "Cancelled bookings release the vendor's blocked date and any pending invoices are marked cancelled.",
        order: 4,
      },
      {
        question: "How do I upgrade to Premium?",
        answer:
          "Go to Settings > Upgrade Plan and select Premium to unlock unlimited invoices, AI insights, and featured listing.",
        order: 5,
      },
    ],
    skipDuplicates: true,
  });

  console.log(
    "\nSeed complete. Test accounts (all use password: password123):",
  );
  console.log(`  Host:   host@planam.test   (id: ${host.id})`);
  console.log(`  Vendor: vendor@planam.test (id: ${vendorUser.id})`);
  console.log(`\nKey IDs for testing:`);
  console.log(`  Event ID:         ${event.id}`);
  console.log(`  Vendor Profile ID: ${vendorProfile.id}`);
  console.log(`  Package ID:       ${goldPackage.id}`);
  console.log(`  Menu Item IDs:    ${menuItems.map((m) => m.id).join(", ")}`);
  console.log(`  Add-On ID:        ${liveGrillAddOn.id}`);
  console.log(`  Lead ID:          ${lead.id}`);
  console.log(`  Quotation ID:     ${quotation.id}`);
  console.log(`  Booking ID:       ${booking.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
