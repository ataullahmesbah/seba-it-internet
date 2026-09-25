/**
 * Demo seed (PRD Section 23) — SEBA IT Internet demo brand.
 * Safe to re-run: singletons are upserted and list tables are only filled when empty.
 *
 *   ALLOW_DEMO_SEED=true DEMO_ADMIN_EMAIL=... DEMO_ADMIN_PASSWORD=... npm run db:seed
 */
import { PrismaClient, type NavLocation, type Prisma } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { DEFAULT_ROLES, PERMISSIONS } from "../src/lib/auth/permissions";
import { DEFAULT_GENERAL, DEFAULT_SECURITY } from "../src/features/settings-defaults";

const db = new PrismaClient();

function assertSafety() {
  const isProd = process.env.NODE_ENV === "production";
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Refusing to seed: set ALLOW_DEMO_SEED=true explicitly (never in production with real data).");
  }
  if (isProd) console.warn("⚠  Seeding demo content in a production NODE_ENV because ALLOW_DEMO_SEED=true.");
  const pw = process.env.DEMO_ADMIN_PASSWORD;
  if (!pw || pw.length < 12) throw new Error("DEMO_ADMIN_PASSWORD is required (min 12 characters) — no hardcoded passwords are used.");
  if (!process.env.DEMO_ADMIN_EMAIL) throw new Error("DEMO_ADMIN_EMAIL is required.");
}

async function seedRbac() {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({ where: { key }, create: { key, description }, update: { description } });
  }
  const perms = await db.permission.findMany();
  const byKey = new Map(perms.map((p) => [p.key, p.id]));
  for (const [name, def] of Object.entries(DEFAULT_ROLES)) {
    const role = await db.role.upsert({
      where: { name },
      create: { name, label: def.label, description: def.description, isSystem: true },
      update: { label: def.label, description: def.description, isSystem: true },
    });
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({ data: def.permissions.map((k) => ({ roleId: role.id, permissionId: byKey.get(k)! })) });
  }
  const email = process.env.DEMO_ADMIN_EMAIL!.toLowerCase().trim();
  const passwordHash = await hash(process.env.DEMO_ADMIN_PASSWORD!, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const admin = await db.user.upsert({
    where: { email },
    create: { email, displayName: "Demo Super Admin", passwordHash, isActive: true },
    update: {},
  });
  const superRole = await db.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  await db.userRole.upsert({ where: { userId_roleId: { userId: admin.id, roleId: superRole.id } }, create: { userId: admin.id, roleId: superRole.id }, update: {} });

  // Optional role test accounts — development only, never in production.
  if (process.env.NODE_ENV !== "production" && process.env.SEED_ROLE_USERS !== "false") {
    const [, domain] = email.split("@");
    for (const [role, local, name] of [
      ["ADMIN", "manager", "Demo Admin"],
      ["MODERATOR", "moderator", "Demo Moderator"],
      ["SUPPORT_ADMIN", "support", "Demo Support"],
    ] as const) {
      const r = await db.role.findUniqueOrThrow({ where: { name: role } });
      const u = await db.user.upsert({ where: { email: `${local}@${domain}` }, create: { email: `${local}@${domain}`, displayName: name, passwordHash }, update: {} });
      await db.userRole.upsert({ where: { userId_roleId: { userId: u.id, roleId: r.id } }, create: { userId: u.id, roleId: r.id }, update: {} });
    }
  }
  return admin;
}

async function seedBrand() {
  await db.brandSetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      companyName: "SEBA IT Internet",
      shortName: "SEBA IT",
      taglineEn: "Fast. Reliable. Connected.",
      taglineBn: "দ্রুত। নির্ভরযোগ্য। সবসময় সংযুক্ত।",
      descriptionEn: "Reliable, affordable, future-ready fiber internet for homes and businesses across Bangladesh.",
      descriptionBn: "বাংলাদেশজুড়ে বাসা ও ব্যবসার জন্য নির্ভরযোগ্য, সাশ্রয়ী ও আধুনিক ফাইবার ইন্টারনেট।",
      primaryColor: "#0A66FF",
      secondaryColor: "#071A2E",
      accentColor: "#00BCEB",
      hotline: "096XX-XXXXXX",
      salesPhone: "096XX-XXXXXX",
      supportEmail: "support@demo.sebait.local",
      salesEmail: "sales@demo.sebait.local",
      whatsappUrl: null,
      messengerUrl: null,
    },
  });
  if ((await db.socialLink.count()) === 0) {
    await db.socialLink.createMany({
      data: [
        { platform: "facebook", url: "https://facebook.com/", displayOrder: 1 },
        { platform: "youtube", url: "https://youtube.com/", displayOrder: 2 },
        { platform: "linkedin", url: "https://linkedin.com/", displayOrder: 3 },
        { platform: "instagram", url: "https://instagram.com/", displayOrder: 4 },
      ],
    });
  }
  await db.siteSetting.upsert({ where: { key: "general" }, update: {}, create: { key: "general", value: DEFAULT_GENERAL as unknown as Prisma.InputJsonValue } });
  await db.siteSetting.upsert({ where: { key: "security" }, update: {}, create: { key: "security", value: DEFAULT_SECURITY as unknown as Prisma.InputJsonValue } });
}

async function seedNavigation() {
  if ((await db.navigationItem.count()) > 0) return;
  const items: Array<[NavLocation, string, string, string]> = [
    ["HEADER", "Home", "হোম", "/"],
    ["HEADER", "Packages", "প্যাকেজ", "/packages"],
    ["HEADER", "Corporate", "কর্পোরেট", "/corporate"],
    ["HEADER", "Coverage", "কভারেজ", "/coverage"],
    ["HEADER", "Pay Bill", "বিল পরিশোধ", "/pay-bill"],
    ["HEADER", "Blog", "ব্লগ", "/blog"],
    ["HEADER", "About", "আমাদের সম্পর্কে", "/about"],
    ["HEADER", "Support", "সাপোর্ট", "/support"],
    ["HEADER", "Contact", "যোগাযোগ", "/contact"],
    ["FOOTER_COMPANY", "About Us", "আমাদের সম্পর্কে", "/about"],
    ["FOOTER_COMPANY", "Our Offices", "আমাদের অফিস", "/contact#offices"],
    ["FOOTER_COMPANY", "Blog", "ব্লগ", "/blog"],
    ["FOOTER_INTERNET", "Home Packages", "হোম প্যাকেজ", "/packages"],
    ["FOOTER_INTERNET", "Corporate Internet", "কর্পোরেট ইন্টারনেট", "/corporate"],
    ["FOOTER_INTERNET", "Coverage", "কভারেজ", "/coverage"],
    ["FOOTER_INTERNET", "Get Connection", "সংযোগ নিন", "/get-connection"],
    ["FOOTER_SUPPORT", "Support / FAQ", "সাপোর্ট / জিজ্ঞাসা", "/support"],
    ["FOOTER_SUPPORT", "Contact", "যোগাযোগ", "/contact"],
    ["FOOTER_SUPPORT", "Pay Bill", "বিল পরিশোধ", "/pay-bill"],
    ["FOOTER_LEGAL", "Privacy Policy", "গোপনীয়তা নীতি", "/privacy"],
    ["FOOTER_LEGAL", "Terms & Conditions", "শর্তাবলী", "/terms"],
    ["FOOTER_LEGAL", "Payment / Refund Policy", "পেমেন্ট / রিফান্ড নীতি", "/payment-policy"],
  ];
  const counters: Record<string, number> = {};
  await db.navigationItem.createMany({
    data: items.map(([location, labelEn, labelBn, url]) => ({ location, labelEn, labelBn, url, displayOrder: (counters[location] = (counters[location] ?? 0) + 1) })),
  });
}

async function seedPackages() {
  if ((await db.package.count()) > 0) return;
  const pk: Array<{ slug: string; en: string; bn: string; tagEn: string; tagBn: string; speed: number; price: number; icon: string; popular?: boolean; featured?: boolean; feats: Array<[string, string]> }> = [
    { slug: "lite", en: "Lite", bn: "লাইট", tagEn: "Perfect for light browsing", tagBn: "হালকা ব্রাউজিংয়ের জন্য", speed: 20, price: 500, icon: "house", feats: [["Ideal for 1-2 devices", "১-২টি ডিভাইসের জন্য আদর্শ"], ["Web browsing & social media", "ওয়েব ব্রাউজিং ও সোশ্যাল মিডিয়া"], ["HD video streaming", "এইচডি ভিডিও স্ট্রিমিং"]] },
    { slug: "starter", en: "Starter", bn: "স্টার্টার", tagEn: "Great for everyday use", tagBn: "প্রতিদিনের ব্যবহারের জন্য", speed: 30, price: 650, icon: "house", feats: [["Ideal for small families", "ছোট পরিবারের জন্য আদর্শ"], ["Online class & remote work", "অনলাইন ক্লাস ও রিমোট কাজ"], ["Social media & video streaming", "সোশ্যাল মিডিয়া ও ভিডিও স্ট্রিমিং"]] },
    { slug: "smart", en: "Smart", bn: "স্মার্ট", tagEn: "Better speed. More freedom.", tagBn: "আরও গতি, আরও স্বাধীনতা", speed: 50, price: 800, icon: "house", featured: true, feats: [["Ideal for 3-5 devices", "৩-৫টি ডিভাইসের জন্য আদর্শ"], ["HD & 4K video streaming", "এইচডি ও ৪কে ভিডিও স্ট্রিমিং"], ["Online gaming (casual)", "অনলাইন গেমিং (সাধারণ)"]] },
    { slug: "family", en: "Family", bn: "ফ্যামিলি", tagEn: "Perfect for modern families", tagBn: "আধুনিক পরিবারের জন্য", speed: 75, price: 950, icon: "users", featured: true, feats: [["Ideal for multiple devices", "একাধিক ডিভাইসের জন্য আদর্শ"], ["4K streaming on multiple screens", "একাধিক স্ক্রিনে ৪কে স্ট্রিমিং"], ["Online gaming & video calls", "অনলাইন গেমিং ও ভিডিও কল"]] },
    { slug: "popular", en: "Popular", bn: "পপুলার", tagEn: "Our best value plan", tagBn: "আমাদের সেরা ভ্যালু প্ল্যান", speed: 100, price: 1100, icon: "crown", popular: true, featured: true, feats: [["Ideal for large families", "বড় পরিবারের জন্য আদর্শ"], ["4K streaming & online gaming", "৪কে স্ট্রিমিং ও অনলাইন গেমিং"], ["Perfect for work & entertainment", "কাজ ও বিনোদনের জন্য উপযুক্ত"]] },
    { slug: "power", en: "Power", bn: "পাওয়ার", tagEn: "For heavy users", tagBn: "ভারী ব্যবহারকারীদের জন্য", speed: 125, price: 1300, icon: "zap", feats: [["Ideal for power users", "পাওয়ার ইউজারদের জন্য আদর্শ"], ["4K/8K streaming", "৪কে/৮কে স্ট্রিমিং"], ["Large file downloads & cloud", "বড় ফাইল ডাউনলোড ও ক্লাউড"]] },
    { slug: "gamer", en: "Gamer", bn: "গেমার", tagEn: "Built for gaming & streaming", tagBn: "গেমিং ও স্ট্রিমিংয়ের জন্য তৈরি", speed: 150, price: 1600, icon: "gamepad", featured: true, feats: [["Ultra-low latency", "অত্যন্ত কম ল্যাটেন্সি"], ["Perfect for online gaming", "অনলাইন গেমিংয়ের জন্য উপযুক্ত"], ["Smooth multi-device usage", "একাধিক ডিভাইসে মসৃণ ব্যবহার"]] },
    { slug: "ultra", en: "Ultra", bn: "আল্ট্রা", tagEn: "Maximum speed. No limits.", tagBn: "সর্বোচ্চ গতি, কোনো সীমা নেই", speed: 200, price: 2000, icon: "rocket", feats: [["Ideal for 10+ devices", "১০+ ডিভাইসের জন্য আদর্শ"], ["8K streaming & VR ready", "৮কে স্ট্রিমিং ও ভিআর রেডি"], ["Best for smart homes & heavy use", "স্মার্ট হোম ও ভারী ব্যবহারের জন্য সেরা"]] },
  ];
  const common: Array<[string, string]> = [
    ["Unlimited Internet", "আনলিমিটেড ইন্টারনেট"],
    ["BDIX Connectivity", "বিডিআইএক্স কানেক্টিভিটি"],
  ];
  for (const [i, p] of pk.entries()) {
    await db.package.create({
      data: {
        slug: p.slug,
        nameEn: p.en,
        nameBn: p.bn,
        taglineEn: p.tagEn,
        taglineBn: p.tagBn,
        speedMbps: p.speed,
        price: p.price,
        billingPeriod: "MONTHLY",
        vatNoteEn: "Includes 5% VAT (demo — verify)",
        vatNoteBn: "৫% ভ্যাট সহ (ডেমো — যাচাই করুন)",
        installationNoteEn: "Free standard installation",
        installationNoteBn: "ফ্রি স্ট্যান্ডার্ড ইনস্টলেশন",
        popular: Boolean(p.popular),
        featured: Boolean(p.featured),
        iconKey: p.icon,
        displayOrder: i + 1,
        features: { create: [...p.feats, ...common].slice(0, 5).map(([labelEn, labelBn], j) => ({ labelEn, labelBn, displayOrder: j })) },
      },
    });
  }
}

async function seedCorporate() {
  if ((await db.corporateService.count()) > 0) return;
  const rows: Array<[string, string, string, string, string, string]> = [
    ["dedicated-internet", "Dedicated Internet", "ডেডিকেটেড ইন্টারনেট", "High-performance, dedicated bandwidth for your critical business operations.", "আপনার গুরুত্বপূর্ণ ব্যবসায়িক কাজের জন্য উচ্চ-ক্ষমতার ডেডিকেটেড ব্যান্ডউইথ।", "server"],
    ["business-connectivity", "Business Connectivity", "বিজনেস কানেক্টিভিটি", "Connect multiple branches, offices and teams seamlessly across Bangladesh.", "বাংলাদেশজুড়ে একাধিক শাখা, অফিস ও টিমকে নির্বিঘ্নে সংযুক্ত করুন।", "network"],
    ["static-public-ip", "Static / Public IP", "স্ট্যাটিক / পাবলিক আইপি", "Get static IP addresses for servers, CCTV, VPN and mission-critical applications.", "সার্ভার, সিসিটিভি, ভিপিএন ও গুরুত্বপূর্ণ অ্যাপ্লিকেশনের জন্য স্ট্যাটিক আইপি।", "globe"],
    ["redundant-connection", "Redundant Connection", "রিডান্ড্যান্ট কানেকশন", "Ensure business continuity with backup links and automatic failover solutions.", "ব্যাকআপ লিংক ও অটোমেটিক ফেইলওভারের মাধ্যমে ব্যবসার ধারাবাহিকতা নিশ্চিত করুন।", "shield-check"],
    ["managed-network", "Managed Network", "ম্যানেজড নেটওয়ার্ক", "Let our experts manage, monitor and optimize your network 24/7.", "আমাদের বিশেষজ্ঞরা ২৪/৭ আপনার নেটওয়ার্ক পরিচালনা ও পর্যবেক্ষণ করবেন।", "settings"],
    ["data-connectivity", "Data Connectivity", "ডেটা কানেক্টিভিটি", "Secure and high-speed connectivity for your data, cloud and enterprise applications.", "আপনার ডেটা, ক্লাউড ও এন্টারপ্রাইজ অ্যাপ্লিকেশনের জন্য নিরাপদ ও দ্রুত সংযোগ।", "cloud"],
    ["priority-support", "24/7 Priority Support", "২৪/৭ প্রায়োরিটি সাপোর্ট", "Get dedicated enterprise support with faster response time and expert assistance whenever you need it.", "যখনই প্রয়োজন, দ্রুত রেসপন্স ও বিশেষজ্ঞ সহায়তাসহ ডেডিকেটেড এন্টারপ্রাইজ সাপোর্ট।", "headphones"],
  ];
  await db.corporateService.createMany({
    data: rows.map(([slug, titleEn, titleBn, descriptionEn, descriptionBn, iconKey], i) => ({ slug, titleEn, titleBn, descriptionEn, descriptionBn, iconKey, displayOrder: i + 1 })),
  });
}

async function seedCoverage() {
  if ((await db.district.count()) > 0) return;
  const data: Array<{ en: string; bn: string; thanas: Array<{ en: string; bn: string; areas: Array<[string, string]> }> }> = [
    {
      en: "Dhaka",
      bn: "ঢাকা",
      thanas: [
        { en: "Mirpur", bn: "মিরপুর", areas: [["Mirpur 1", "মিরপুর ১"], ["Mirpur 10", "মিরপুর ১০"], ["Mirpur 11", "মিরপুর ১১"], ["Kazipara", "কাজীপাড়া"], ["Shewrapara", "শেওড়াপাড়া"]] },
        { en: "Uttara", bn: "উত্তরা", areas: [["Sector 3", "সেক্টর ৩"], ["Sector 4", "সেক্টর ৪"], ["Sector 7", "সেক্টর ৭"], ["Sector 10", "সেক্টর ১০"], ["Sector 12", "সেক্টর ১২"]] },
        { en: "Dhanmondi", bn: "ধানমন্ডি", areas: [["Road 2", "রোড ২"], ["Road 8", "রোড ৮"], ["Road 15", "রোড ১৫"], ["Jigatola", "জিগাতলা"]] },
      ],
    },
    { en: "Gazipur", bn: "গাজীপুর", thanas: [{ en: "Gazipur Sadar", bn: "গাজীপুর সদর", areas: [["Demo Area A", "ডেমো এলাকা এ"], ["Demo Area B", "ডেমো এলাকা বি"], ["Demo Area C", "ডেমো এলাকা সি"]] }] },
    { en: "Narayanganj", bn: "নারায়ণগঞ্জ", thanas: [{ en: "Narayanganj Sadar", bn: "নারায়ণগঞ্জ সদর", areas: [["Demo Area A", "ডেমো এলাকা এ"], ["Demo Area B", "ডেমো এলাকা বি"], ["Demo Area C", "ডেমো এলাকা সি"]] }] },
  ];
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for (const [di, d] of data.entries()) {
    const district = await db.district.create({ data: { nameEn: d.en, nameBn: d.bn, slug: slug(d.en), displayOrder: di + 1 } });
    for (const [ti, t] of d.thanas.entries()) {
      const thana = await db.thana.create({ data: { districtId: district.id, nameEn: t.en, nameBn: t.bn, slug: slug(t.en), displayOrder: ti + 1 } });
      await db.coverageArea.createMany({
        data: t.areas.map(([en, bn], ai) => ({ thanaId: thana.id, nameEn: en, nameBn: bn, slug: slug(en), displayOrder: ai + 1 })),
      });
    }
  }
  // One inactive demo area to demonstrate the "not available" path.
  const uttara = await db.thana.findFirst({ where: { slug: "uttara" } });
  if (uttara) await db.coverageArea.create({ data: { thanaId: uttara.id, nameEn: "Sector 18 (coming soon)", nameBn: "সেক্টর ১৮ (শীঘ্রই)", slug: "sector-18", active: false, displayOrder: 99, internalNote: "Planned expansion — demo inactive area" } });
}

async function seedPayments() {
  if ((await db.paymentMethod.count()) > 0) return;
  const steps = (app: string, appBn: string): { en: string[]; bn: string[] } => ({
    en: [`Open your ${app} app`, 'Tap on "Send Money"', `Enter our ${app} number shown above`, "Enter your Customer ID as Reference", "Confirm the payment and keep the receipt"],
    bn: [`আপনার ${appBn} অ্যাপ খুলুন`, '"সেন্ড মানি" অপশনে ট্যাপ করুন', `উপরে দেখানো আমাদের ${appBn} নম্বর লিখুন`, "রেফারেন্স হিসেবে আপনার কাস্টমার আইডি লিখুন", "পেমেন্ট নিশ্চিত করুন এবং রসিদ সংরক্ষণ করুন"],
  });
  const mobile: Array<["BKASH" | "NAGAD" | "ROCKET", string, string, string]> = [
    ["BKASH", "bKash", "বিকাশ", "DEMO-017XXXXXXXX"],
    ["NAGAD", "Nagad", "নগদ", "DEMO-018XXXXXXXX"],
    ["ROCKET", "Rocket", "রকেট", "DEMO-019XXXXXXXX"],
  ];
  let order = 1;
  for (const [type, en, bn, acc] of mobile) {
    const st = steps(en, bn);
    await db.paymentMethod.create({
      data: {
        type,
        titleEn: en,
        titleBn: bn,
        accountNumber: acc,
        accountTypeEn: "Personal (demo placeholder)",
        accountTypeBn: "পার্সোনাল (ডেমো)",
        referenceInstructionEn: "Use your Customer ID as reference (e.g. SEB12345)",
        referenceInstructionBn: "রেফারেন্স হিসেবে কাস্টমার আইডি ব্যবহার করুন (যেমন: SEB12345)",
        instructionsEn: st.en,
        instructionsBn: st.bn,
        displayOrder: order++,
      },
    });
  }
  await db.paymentMethod.create({
    data: {
      type: "BANK",
      titleEn: "Bank Transfer",
      titleBn: "ব্যাংক ট্রান্সফার",
      bankName: "Demo Bank Ltd.",
      accountName: "SEBA IT Internet",
      accountNumber: "DEMO-ACCOUNT",
      accountTypeEn: "Current Account",
      accountTypeBn: "চলতি হিসাব",
      branch: "Demo Branch",
      routingNumber: "DEMO-ROUTING",
      referenceInstructionEn: "Please use your Customer ID as the payment reference/narration.",
      referenceInstructionBn: "অনুগ্রহ করে পেমেন্টের রেফারেন্স/বিবরণে আপনার কাস্টমার আইডি লিখুন।",
      instructionsEn: ["Transfer via online banking, app or any branch", "Write your Customer ID in the narration", "Send the deposit slip/screenshot to support"],
      instructionsBn: ["অনলাইন ব্যাংকিং, অ্যাপ বা যেকোনো শাখা থেকে ট্রান্সফার করুন", "বিবরণে আপনার কাস্টমার আইডি লিখুন", "জমার রসিদ/স্ক্রিনশট সাপোর্টে পাঠান"],
      displayOrder: order++,
    },
  });
}

async function seedFaqs() {
  if ((await db.fAQ.count()) > 0) return;
  const cats = [
    ["packages", "Packages & Pricing", "প্যাকেজ ও মূল্য"],
    ["installation", "Installation & Coverage", "ইনস্টলেশন ও কভারেজ"],
    ["billing", "Billing & Payment", "বিল ও পেমেন্ট"],
    ["support", "Support", "সাপোর্ট"],
  ] as const;
  const catIds: Record<string, string> = {};
  for (const [i, [slug, en, bn]] of cats.entries()) {
    const c = await db.fAQCategory.create({ data: { slug, nameEn: en, nameBn: bn, displayOrder: i + 1 } });
    catIds[slug] = c.id;
  }
  const faqs: Array<[string, string, string, string, string, boolean]> = [
    ["installation", "How can I check if the internet is available in my area?", "আমার এলাকায় ইন্টারনেট আছে কিনা কীভাবে জানব?", "Use the coverage checker on our home or Coverage page: select your District, Thana/Upazila and Area. If we are not there yet, leave your number and we will notify you.", "হোম বা কভারেজ পেজের কভারেজ চেকারে জেলা, থানা/উপজেলা ও এলাকা নির্বাচন করুন। সেবা না থাকলে নম্বর দিন, চালু হলে জানিয়ে দেব।", true],
    ["installation", "What documents are required for a new connection?", "নতুন সংযোগের জন্য কী কী কাগজপত্র লাগে?", "Only your name, mobile number and installation address are needed to request a connection. Our team will confirm any other requirement by phone.", "সংযোগের অনুরোধে শুধু আপনার নাম, মোবাইল নম্বর ও ইনস্টলেশন ঠিকানা লাগবে। অন্য কিছু লাগলে আমাদের টিম ফোনে জানাবে।", true],
    ["installation", "How long does it take to get a new connection?", "নতুন সংযোগ পেতে কত সময় লাগে?", "In covered areas installation is usually completed within 24-72 hours after confirmation (demo text — verify with your ISP).", "কভারেজ এলাকায় সাধারণত নিশ্চিত হওয়ার ২৪-৭২ ঘণ্টার মধ্যে ইনস্টলেশন সম্পন্ন হয় (ডেমো তথ্য)।", true],
    ["packages", "Can I change my package later?", "পরে কি প্যাকেজ পরিবর্তন করা যাবে?", "Yes. You can upgrade or downgrade your package by contacting support. Changes usually apply from the next billing cycle.", "হ্যাঁ। সাপোর্টে যোগাযোগ করে প্যাকেজ আপগ্রেড বা ডাউনগ্রেড করতে পারবেন। সাধারণত পরবর্তী বিলিং সাইকেল থেকে কার্যকর হয়।", true],
    ["packages", "Do you provide a router? Is there any extra cost?", "রাউটার দেওয়া হয় কি? কোনো অতিরিক্ত খরচ আছে?", "Router availability and installation charges depend on the current offer. Please check the package notes or ask our team.", "রাউটার ও ইনস্টলেশন চার্জ বর্তমান অফারের উপর নির্ভর করে। প্যাকেজের নোট দেখুন বা আমাদের জিজ্ঞাসা করুন।", true],
    ["packages", "Are there any hidden charges?", "কোনো লুকানো চার্জ আছে কি?", "No. Package prices, VAT and installation notes are shown on each package card.", "না। প্রতিটি প্যাকেজ কার্ডে মূল্য, ভ্যাট ও ইনস্টলেশনের তথ্য দেওয়া আছে।", false],
    ["support", "What kind of customer support do you offer?", "আপনারা কী ধরনের গ্রাহক সাপোর্ট দেন?", "Phone support, email, live chat and on-site technical support. Chat messages are saved 24/7 and answered when an agent is online.", "ফোন, ইমেইল, লাইভ চ্যাট ও অন-সাইট টেকনিক্যাল সাপোর্ট। চ্যাট বার্তা ২৪/৭ সংরক্ষিত হয় এবং এজেন্ট অনলাইনে এলে উত্তর দেওয়া হয়।", true],
    ["billing", "How do I pay my monthly bill?", "মাসিক বিল কীভাবে পরিশোধ করব?", "Visit the Pay Bill page and follow the instructions for bKash, Nagad, Rocket or bank transfer. Always use your Customer ID as the reference.", "বিল পরিশোধ পেজে গিয়ে বিকাশ, নগদ, রকেট বা ব্যাংক ট্রান্সফারের নির্দেশনা অনুসরণ করুন। সবসময় রেফারেন্স হিসেবে কাস্টমার আইডি দিন।", false],
    ["billing", "Where can I find my Customer ID?", "কাস্টমার আইডি কোথায় পাব?", "Your Customer ID is on your connection documents and payment SMS. You can also ask our support team.", "আপনার কাস্টমার আইডি সংযোগের কাগজ ও পেমেন্ট এসএমএসে থাকে। সাপোর্ট টিমের কাছেও জানতে পারবেন।", false],
    ["billing", "My payment is not reflecting. What should I do?", "পেমেন্ট দেখাচ্ছে না, কী করব?", "Keep your transaction ID and contact support with your Customer ID. We will verify and update your account.", "ট্রানজেকশন আইডি সংরক্ষণ করে কাস্টমার আইডিসহ সাপোর্টে যোগাযোগ করুন। আমরা যাচাই করে আপডেট করে দেব।", false],
    ["support", "Do you offer corporate or dedicated internet?", "কর্পোরেট বা ডেডিকেটেড ইন্টারনেট দেন কি?", "Yes. Visit the Corporate page and submit an inquiry — our business team will prepare a custom proposal.", "হ্যাঁ। কর্পোরেট পেজে গিয়ে অনুসন্ধান জমা দিন — আমাদের বিজনেস টিম কাস্টম প্রস্তাব দেবে।", false],
    ["installation", "What happens if my area is not covered?", "আমার এলাকায় সেবা না থাকলে কী হবে?", "Use the Notify Me form after checking coverage. We track demand and prioritize expansion to requested areas.", "কভারেজ চেক করার পর 'আমাকে জানাবেন' ফর্ম পূরণ করুন। আমরা চাহিদা অনুযায়ী নতুন এলাকায় সম্প্রসারণ করি।", false],
  ];
  await db.fAQ.createMany({
    data: faqs.map(([cat, qEn, qBn, aEn, aBn, featured], i) => ({ categoryId: catIds[cat], questionEn: qEn, questionBn: qBn, answerEn: aEn, answerBn: aBn, featured, displayOrder: i + 1 })),
  });
}

async function seedReviews() {
  if ((await db.review.count()) > 0) return;
  await db.review.createMany({
    data: [
      { displayName: "Demo Customer A", areaOrCompany: "Uttara, Dhaka", rating: 5, featured: true, displayOrder: 1, quoteEn: "The connection has been stable for months and support responds quickly. Great for work from home.", quoteBn: "কয়েক মাস ধরে সংযোগ একদম স্থিতিশীল, সাপোর্টও দ্রুত সাড়া দেয়। বাসা থেকে কাজের জন্য দারুণ।" },
      { displayName: "Demo Customer B", areaOrCompany: "Mirpur, Dhaka", rating: 5, featured: true, displayOrder: 2, quoteEn: "Installation was quick and the team explained everything. Streaming and online classes run smoothly.", quoteBn: "ইনস্টলেশন দ্রুত হয়েছে এবং টিম সব বুঝিয়ে দিয়েছে। স্ট্রিমিং ও অনলাইন ক্লাস মসৃণভাবে চলে।" },
      { displayName: "Demo Business C", areaOrCompany: "Demo Company Ltd.", rating: 4, featured: true, displayOrder: 3, quoteEn: "Reliable internet partner for our office. Their corporate team is professional and always responsive.", quoteBn: "আমাদের অফিসের জন্য নির্ভরযোগ্য ইন্টারনেট পার্টনার। কর্পোরেট টিম পেশাদার ও সবসময় সহায়ক।" },
      { displayName: "Demo Customer D", areaOrCompany: "Dhanmondi, Dhaka", rating: 5, displayOrder: 4, quoteEn: "Low latency for gaming and the Pay Bill instructions are very clear.", quoteBn: "গেমিংয়ে ল্যাটেন্সি কম আর বিল পরিশোধের নির্দেশনাও খুব পরিষ্কার।" },
    ],
  });
}

async function seedOffer() {
  if ((await db.offer.count()) > 0) return;
  await db.offer.create({
    data: {
      titleEn: "2 Months FREE",
      titleBn: "২ মাস ফ্রি",
      descriptionEn: "On all annual packages. Get faster. Go further. (Demo offer — editable from dashboard)",
      descriptionBn: "সকল বার্ষিক প্যাকেজে। আরও দ্রুত, আরও এগিয়ে। (ডেমো অফার — ড্যাশবোর্ড থেকে পরিবর্তনযোগ্য)",
      ctaLabelEn: "Get This Offer",
      ctaLabelBn: "অফারটি নিন",
      ctaUrl: "/get-connection",
      highlightsEn: ["Free Installation", "Free Router", "No Hidden Fees", "24/7 Support"],
      highlightsBn: ["ফ্রি ইনস্টলেশন", "ফ্রি রাউটার", "কোনো লুকানো চার্জ নেই", "২৪/৭ সাপোর্ট"],
      startAt: new Date(),
      endAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      priority: 10,
    },
  });
}

async function seedOffices() {
  if ((await db.office.count()) > 0) return;
  await db.office.createMany({
    data: [
      { nameEn: "Head Office", nameBn: "প্রধান কার্যালয়", type: "HEAD_OFFICE", isPrimary: true, addressEn: "House 00, Road 0 (demo address)\nDhaka 1200, Bangladesh", addressBn: "বাড়ি ০০, রোড ০ (ডেমো ঠিকানা)\nঢাকা ১২০০, বাংলাদেশ", phone: "096XX-XXXXXX", email: "support@demo.sebait.local", hoursEn: "Sat - Thu: 9:00 AM - 8:00 PM", hoursBn: "শনি - বৃহস্পতি: সকাল ৯টা - রাত ৮টা", mapUrl: "https://maps.google.com/?q=Dhaka", displayOrder: 1 },
      { nameEn: "Uttara Branch", nameBn: "উত্তরা শাখা", type: "BRANCH", addressEn: "Demo Branch Address, Uttara, Dhaka", addressBn: "ডেমো শাখার ঠিকানা, উত্তরা, ঢাকা", phone: "096XX-XXXXXX", hoursEn: "Sat - Thu: 10:00 AM - 7:00 PM", hoursBn: "শনি - বৃহস্পতি: সকাল ১০টা - সন্ধ্যা ৭টা", displayOrder: 2 },
      { nameEn: "Mirpur Branch", nameBn: "মিরপুর শাখা", type: "BRANCH", addressEn: "Demo Branch Address, Mirpur, Dhaka", addressBn: "ডেমো শাখার ঠিকানা, মিরপুর, ঢাকা", phone: "096XX-XXXXXX", hoursEn: "Sat - Thu: 10:00 AM - 7:00 PM", hoursBn: "শনি - বৃহস্পতি: সকাল ১০টা - সন্ধ্যা ৭টা", displayOrder: 3 },
    ],
  });
}

async function seedBlog(adminId: string) {
  if ((await db.blogPost.count()) > 0) return;
  const cats = [
    ["internet-tips", "Internet Tips", "ইন্টারনেট টিপস"],
    ["technology", "Technology", "প্রযুক্তি"],
    ["company-news", "Company News", "কোম্পানির খবর"],
    ["online-safety", "Online Safety", "অনলাইন নিরাপত্তা"],
  ] as const;
  const ids: Record<string, string> = {};
  for (const [i, [slug, en, bn]] of cats.entries()) ids[slug] = (await db.blogCategory.create({ data: { slug, nameEn: en, nameBn: bn, displayOrder: i + 1 } })).id;
  const day = 24 * 3600 * 1000;
  const posts = [
    {
      slug: "wifi-router-placement-tips",
      cat: "internet-tips",
      featured: true,
      titleEn: "Wi-Fi Router Placement: 7 Tips for Faster Home Internet",
      titleBn: "ওয়াই-ফাই রাউটার কোথায় রাখবেন: দ্রুত ইন্টারনেটের ৭টি টিপস",
      excerptEn: "Small changes to where your router sits can dramatically improve speed and coverage in every room.",
      excerptBn: "রাউটারের অবস্থান সামান্য বদলালেই প্রতিটি ঘরে গতি ও কভারেজ অনেক ভালো হতে পারে।",
      contentEn: "<p>Your router's position matters as much as your package speed. Walls, mirrors and appliances all weaken Wi-Fi signals.</p><h2>1. Keep it central and elevated</h2><p>Place the router in a central spot, ideally on a shelf, not on the floor or inside a cabinet.</p><h2>2. Avoid interference</h2><p>Keep it away from microwaves, cordless phones and thick concrete walls.</p><h2>3. Use 5 GHz for speed</h2><p>Connect nearby devices to the 5 GHz band for faster speed, and use 2.4 GHz for longer range.</p><ul><li>Restart your router once a week</li><li>Update firmware regularly</li><li>Use a strong WPA2/WPA3 password</li></ul>",
      contentBn: "<p>রাউটারের অবস্থান প্যাকেজের গতির মতোই গুরুত্বপূর্ণ। দেয়াল, আয়না ও ইলেকট্রনিক যন্ত্র ওয়াই-ফাই সিগন্যাল দুর্বল করে।</p><h2>১. মাঝামাঝি ও উঁচুতে রাখুন</h2><p>রাউটার ঘরের মাঝামাঝি জায়গায়, সম্ভব হলে তাকের উপরে রাখুন — মেঝেতে বা আলমারির ভেতরে নয়।</p><h2>২. বাধা এড়িয়ে চলুন</h2><p>মাইক্রোওয়েভ, কর্ডলেস ফোন ও মোটা কংক্রিটের দেয়াল থেকে দূরে রাখুন।</p><h2>৩. গতির জন্য ৫ গিগাহার্টজ</h2><p>কাছের ডিভাইস ৫ গিগাহার্টজে এবং দূরের ডিভাইস ২.৪ গিগাহার্টজে সংযুক্ত করুন।</p><ul><li>সপ্তাহে একবার রাউটার রিস্টার্ট দিন</li><li>নিয়মিত ফার্মওয়্যার আপডেট করুন</li><li>শক্তিশালী WPA2/WPA3 পাসওয়ার্ড ব্যবহার করুন</li></ul>",
      read: 4,
      ago: 3,
    },
    {
      slug: "how-to-choose-the-right-internet-package",
      cat: "internet-tips",
      titleEn: "How to Choose the Right Internet Package for Your Home",
      titleBn: "বাসার জন্য সঠিক ইন্টারনেট প্যাকেজ কীভাবে বাছবেন",
      excerptEn: "Count your devices, think about streaming and gaming, and pick a speed that fits your family.",
      excerptBn: "ডিভাইসের সংখ্যা, স্ট্রিমিং ও গেমিংয়ের চাহিদা বিবেচনা করে পরিবারের উপযোগী গতি বেছে নিন।",
      contentEn: "<p>Choosing a package is easier when you know how your household uses the internet.</p><h2>Count your devices</h2><p>1-2 devices: 20-30 Mbps is usually enough. 3-5 devices: 50-75 Mbps. Large families or 4K streaming: 100 Mbps or more.</p><h2>Think about activities</h2><p>Video calls, online classes and gaming need stable upload speed and low latency, not only high download speed.</p><blockquote>Tip: you can upgrade later — start with what you need today.</blockquote>",
      contentBn: "<p>পরিবারের ইন্টারনেট ব্যবহারের ধরন জানলে প্যাকেজ বাছাই সহজ হয়।</p><h2>ডিভাইস গুনুন</h2><p>১-২টি ডিভাইস: ২০-৩০ Mbps সাধারণত যথেষ্ট। ৩-৫টি: ৫০-৭৫ Mbps। বড় পরিবার বা ৪কে স্ট্রিমিং: ১০০ Mbps বা বেশি।</p><h2>কাজের ধরন ভাবুন</h2><p>ভিডিও কল, অনলাইন ক্লাস ও গেমিংয়ে শুধু ডাউনলোড নয়, স্থিতিশীল আপলোড ও কম ল্যাটেন্সি দরকার।</p><blockquote>টিপস: পরে আপগ্রেড করা যায় — আজকের প্রয়োজন অনুযায়ী শুরু করুন।</blockquote>",
      read: 5,
      ago: 9,
    },
    {
      slug: "online-safety-for-families",
      cat: "online-safety",
      titleEn: "Online Safety for Families: A Simple Guide",
      titleBn: "পরিবারের অনলাইন নিরাপত্তা: একটি সহজ নির্দেশিকা",
      excerptEn: "Practical steps to keep children and parents safe online — passwords, updates and healthy habits.",
      excerptBn: "শিশু ও অভিভাবকদের অনলাইনে নিরাপদ রাখার কার্যকর উপায় — পাসওয়ার্ড, আপডেট ও ভালো অভ্যাস।",
      contentEn: "<p>A fast connection is best enjoyed safely. A few habits protect the whole family.</p><ul><li>Use unique passwords and a password manager</li><li>Turn on two-step verification for email and social media</li><li>Keep phones and computers updated</li><li>Talk with children about what to share online</li></ul><p>Never share OTP codes or your Customer ID password with anyone who calls you unexpectedly.</p>",
      contentBn: "<p>দ্রুত সংযোগ নিরাপদে ব্যবহার করাই সবচেয়ে ভালো। কিছু অভ্যাস পুরো পরিবারকে সুরক্ষিত রাখে।</p><ul><li>প্রতিটি অ্যাকাউন্টে আলাদা পাসওয়ার্ড ও পাসওয়ার্ড ম্যানেজার ব্যবহার করুন</li><li>ইমেইল ও সোশ্যাল মিডিয়ায় টু-স্টেপ ভেরিফিকেশন চালু করুন</li><li>ফোন ও কম্পিউটার আপডেট রাখুন</li><li>অনলাইনে কী শেয়ার করবে তা নিয়ে শিশুদের সাথে কথা বলুন</li></ul><p>অপ্রত্যাশিত ফোনকলে কাউকে কখনো ওটিপি কোড দেবেন না।</p>",
      read: 4,
      ago: 16,
    },
    {
      slug: "network-expansion-update",
      cat: "company-news",
      titleEn: "Network Expansion Update: New Areas Coming Soon",
      titleBn: "নেটওয়ার্ক সম্প্রসারণ: শীঘ্রই নতুন এলাকা",
      excerptEn: "We are extending our fiber network to more areas. Check coverage and register your interest today.",
      excerptBn: "আমরা আরও এলাকায় ফাইবার নেটওয়ার্ক বাড়াচ্ছি। কভারেজ দেখুন এবং আজই আগ্রহ জানান।",
      contentEn: "<p>Thanks to growing demand we are planning new coverage areas. Areas with more registered interest are prioritized.</p><p>Use the coverage checker and the <strong>Notify Me</strong> form so our planning team can include your location. (Demo article.)</p>",
      contentBn: "<p>চাহিদা বাড়ায় আমরা নতুন কভারেজ এলাকার পরিকল্পনা করছি। যেসব এলাকায় বেশি আগ্রহ নিবন্ধিত হয়, সেগুলো অগ্রাধিকার পায়।</p><p>কভারেজ চেকার ও <strong>আমাকে জানাবেন</strong> ফর্ম ব্যবহার করুন যাতে আমাদের টিম আপনার এলাকা বিবেচনা করতে পারে। (ডেমো লেখা।)</p>",
      read: 3,
      ago: 25,
    },
  ];
  for (const p of posts) {
    await db.blogPost.create({
      data: {
        slug: p.slug,
        titleEn: p.titleEn,
        titleBn: p.titleBn,
        excerptEn: p.excerptEn,
        excerptBn: p.excerptBn,
        contentEn: p.contentEn,
        contentBn: p.contentBn,
        categoryId: ids[p.cat],
        authorId: adminId,
        authorDisplayName: "SEBA IT Team",
        status: "PUBLISHED",
        featured: Boolean(p.featured),
        readMinutes: p.read,
        publishedAt: new Date(Date.now() - p.ago * day),
      },
    });
  }
}

type Sections = Record<string, Record<string, unknown>>;

const chip = (icon: string, labelEn: string, labelBn: string) => ({ icon, labelEn, labelBn });
const item = (icon: string, titleEn: string, titleBn: string, descEn = "", descBn = "", url = "") => ({ icon, titleEn, titleBn, descEn, descBn, ...(url ? { url } : {}) });
const hero = (o: Record<string, unknown>) => ({
  chips: [chip("cable", "Fiber Optic Network", "ফাইবার অপটিক নেটওয়ার্ক"), chip("headphones", "24/7 Support", "২৪/৭ সাপোর্ট"), chip("gauge", "Low Latency", "কম ল্যাটেন্সি"), chip("shield-check", "Reliable Connection", "নির্ভরযোগ্য সংযোগ")],
  scriptEn: "A More Connected Bangladesh",
  scriptBn: "আরও সংযুক্ত বাংলাদেশ",
  ...o,
});
const finalCta = {
  headlineEn: "Let's Get You Connected",
  headlineBn: "চলুন আপনাকে সংযুক্ত করি",
  messageEn: "Join thousands of homes and businesses for a faster, brighter tomorrow.",
  messageBn: "দ্রুত ও উজ্জ্বল আগামীর জন্য আমাদের সাথে যুক্ত হোন।",
  scriptEn: "Same People, A More Connected Bangladesh",
  scriptBn: "একই মানুষ, আরও সংযুক্ত বাংলাদেশ",
  pointsEn: ["Faster People", "Stronger Communities", "A Brighter Bangladesh"],
  pointsBn: ["আরও দ্রুত মানুষ", "আরও শক্তিশালী সমাজ", "আরও উজ্জ্বল বাংলাদেশ"],
  primaryCtaLabelEn: "Get Connected Now",
  primaryCtaLabelBn: "এখনই সংযোগ নিন",
  primaryCtaUrl: "/get-connection",
  secondaryCtaLabelEn: "Check Coverage",
  secondaryCtaLabelBn: "কভারেজ দেখুন",
  secondaryCtaUrl: "/coverage",
};
const statsItems = [
  { icon: "map-pin", value: "5", labelEn: "Districts (demo)", labelBn: "জেলা (ডেমো)" },
  { icon: "layers", value: "23", labelEn: "Areas covered (demo)", labelBn: "এলাকা (ডেমো)" },
  { icon: "headphones", value: "24/7", labelEn: "Support hours", labelBn: "সাপোর্ট" },
  { icon: "cable", value: "100%", labelEn: "Fiber backbone", labelBn: "ফাইবার ব্যাকবোন" },
];

const PAGES: Record<string, { titleEn: string; titleBn: string; sections: Sections }> = {
  home: {
    titleEn: "Home",
    titleBn: "হোম",
    sections: {
      hero: hero({
        headlineEn: "Faster Internet",
        headlineBn: "দ্রুত ইন্টারনেট",
        highlightEn: "Brighter Tomorrow",
        highlightBn: "উজ্জ্বল আগামী",
        eyebrowEn: "Reliable · Affordable · Everywhere in Bangladesh",
        eyebrowBn: "নির্ভরযোগ্য · সাশ্রয়ী · বাংলাদেশের সর্বত্র",
        subheadlineEn: "High-speed fiber internet to power your home, business and Bangladesh — for a smarter, connected tomorrow.",
        subheadlineBn: "আপনার বাসা, ব্যবসা ও বাংলাদেশের জন্য হাই-স্পিড ফাইবার ইন্টারনেট — আরও স্মার্ট ও সংযুক্ত আগামীর জন্য।",
        primaryCtaLabelEn: "Get Connected Now",
        primaryCtaLabelBn: "এখনই সংযোগ নিন",
        primaryCtaUrl: "/get-connection",
        secondaryCtaLabelEn: "Check Coverage",
        secondaryCtaLabelBn: "কভারেজ দেখুন",
        secondaryCtaUrl: "/coverage",
      }),
      coverage: { titleEn: "Check Coverage in Your Area", titleBn: "আপনার এলাকায় কভারেজ দেখুন", subtitleEn: "Find out if our internet is available at your location.", subtitleBn: "আপনার লোকেশনে আমাদের ইন্টারনেট আছে কিনা জেনে নিন।" },
      packages: { titleEn: "Our Popular Packages", titleBn: "আমাদের জনপ্রিয় প্যাকেজ", subtitleEn: "High-speed internet packages for your home and family", subtitleBn: "আপনার বাসা ও পরিবারের জন্য হাই-স্পিড ইন্টারনেট প্যাকেজ" },
      serviceIntro: {
        homeTitleEn: "Home Internet",
        homeTitleBn: "হোম ইন্টারনেট",
        homeDescEn: "For a smarter and happier home",
        homeDescBn: "আরও স্মার্ট ও আনন্দময় বাসার জন্য",
        homePointsEn: ["Stable & high-speed connection", "Free router & installation (demo offer)", "Local support", "Easy online payments"],
        homePointsBn: ["স্থিতিশীল ও দ্রুত সংযোগ", "ফ্রি রাউটার ও ইনস্টলেশন (ডেমো অফার)", "স্থানীয় সাপোর্ট", "সহজ অনলাইন পেমেন্ট"],
        homeCtaLabelEn: "Learn More",
        homeCtaLabelBn: "আরও জানুন",
        homeCtaUrl: "/packages",
        homeScriptEn: "Better Connections, Happier Families",
        homeScriptBn: "ভালো সংযোগ, সুখী পরিবার",
        corporateTitleEn: "Corporate Solutions",
        corporateTitleBn: "কর্পোরেট সমাধান",
        corporateDescEn: "Reliable internet for your business",
        corporateDescBn: "আপনার ব্যবসার জন্য নির্ভরযোগ্য ইন্টারনেট",
        corporatePointsEn: ["Dedicated bandwidth", "Static IP (optional)", "24/7 priority support", "Custom solutions"],
        corporatePointsBn: ["ডেডিকেটেড ব্যান্ডউইথ", "স্ট্যাটিক আইপি (ঐচ্ছিক)", "২৪/৭ প্রায়োরিটি সাপোর্ট", "কাস্টম সমাধান"],
        corporateCtaLabelEn: "More About Business",
        corporateCtaLabelBn: "ব্যবসা সম্পর্কে আরও",
        corporateCtaUrl: "/corporate",
        corporateScriptEn: "Powering Bangladesh Business",
        corporateScriptBn: "বাংলাদেশের ব্যবসার শক্তি",
      },
      whyChooseUs: {
        titleEn: "Why Choose SEBA IT Internet?",
        titleBn: "কেন SEBA IT Internet বেছে নেবেন?",
        subtitleEn: "More than just an internet provider — a partner for a brighter Bangladesh",
        subtitleBn: "শুধু ইন্টারনেট প্রোভাইডার নয় — উজ্জ্বল বাংলাদেশের অংশীদার",
        items: [
          item("cable", "Fiber Optic Network", "ফাইবার অপটিক নেটওয়ার্ক", "Fast, reliable internet for modern life", "আধুনিক জীবনের জন্য দ্রুত ও নির্ভরযোগ্য"),
          item("gauge", "Stable Speed", "স্থিতিশীল গতি", "Consistent speed when you need it", "প্রয়োজনের সময় স্থির গতি"),
          item("zap", "Low Latency", "কম ল্যাটেন্সি", "Smooth gaming and video calls", "মসৃণ গেমিং ও ভিডিও কল"),
          item("headphones", "24/7 Support", "২৪/৭ সাপোর্ট", "Always here for you in Bangla & English", "বাংলা ও ইংরেজিতে সবসময় পাশে"),
          item("wrench", "Fast Installation", "দ্রুত ইনস্টলেশন", "Quick setup by our expert team", "দক্ষ টিমের দ্রুত সেটআপ"),
          item("shield-check", "Secure Network", "নিরাপদ নেটওয়ার্ক", "Protected, well-monitored network", "সুরক্ষিত ও পর্যবেক্ষিত নেটওয়ার্ক"),
        ],
      },
      offer: { eyebrowEn: "Limited Time Offer", eyebrowBn: "সীমিত সময়ের অফার", scriptEn: "Same People, Brighter Possibilities", scriptBn: "একই মানুষ, উজ্জ্বল সম্ভাবনা" },
      howItWorks: {
        titleEn: "Get Connected in 4 Steps",
        titleBn: "৪ ধাপে সংযোগ নিন",
        subtitleEn: "From application to activation — it's quick and easy!",
        subtitleBn: "আবেদন থেকে চালু পর্যন্ত — দ্রুত ও সহজ!",
        items: [
          item("zap", "Apply", "আবেদন", "Fill in the form online or call us", "অনলাইনে ফর্ম পূরণ করুন বা কল করুন"),
          item("file-text", "Verify", "যাচাই", "We'll verify your information", "আমরা আপনার তথ্য যাচাই করব"),
          item("users", "Install", "ইনস্টল", "Our team will install at your location", "আমাদের টিম আপনার ঠিকানায় ইনস্টল করবে"),
          item("wifi", "Enjoy", "উপভোগ", "Start enjoying high-speed internet", "হাই-স্পিড ইন্টারনেট উপভোগ শুরু করুন"),
        ],
      },
      stats: { titleEn: "Our Coverage Across Bangladesh", titleBn: "বাংলাদেশজুড়ে আমাদের কভারেজ", subtitleEn: "Expanding every day to keep Bangladesh connected", subtitleBn: "প্রতিদিন বাড়ছে, বাংলাদেশকে সংযুক্ত রাখতে", scriptEn: "Growing Stronger For a Connected Bangladesh", scriptBn: "সংযুক্ত বাংলাদেশের জন্য আরও শক্তিশালী", items: statsItems },
      reviews: { titleEn: "What Our Customers Say", titleBn: "গ্রাহকদের মতামত", subtitleEn: "Demo reviews — replace with real, approved customer feedback.", subtitleBn: "ডেমো মতামত — প্রকৃত অনুমোদিত গ্রাহক মতামত দিয়ে পরিবর্তন করুন।" },
      blog: { titleEn: "Latest from Our Blog", titleBn: "আমাদের ব্লগ থেকে", subtitleEn: "", subtitleBn: "" },
      faq: { titleEn: "Frequently Asked Questions", titleBn: "সচরাচর জিজ্ঞাসা", subtitleEn: "Find quick answers to common questions about our services", subtitleBn: "আমাদের সেবা সম্পর্কে সাধারণ প্রশ্নের দ্রুত উত্তর" },
      support: { titleEn: "Need Help? We're Here for You", titleBn: "সাহায্য দরকার? আমরা আছি আপনার পাশে", subtitleEn: "Choose your preferred support channel", subtitleBn: "আপনার পছন্দের সাপোর্ট চ্যানেল বেছে নিন" },
      finalCta,
    },
  },
  packages: {
    titleEn: "Packages",
    titleBn: "প্যাকেজ",
    sections: {
      hero: hero({
        headlineEn: "Home Internet",
        headlineBn: "হোম ইন্টারনেট",
        highlightEn: "Packages",
        highlightBn: "প্যাকেজ",
        subheadlineEn: "Choose the perfect plan for your home. Faster speeds. Greater value. A more connected tomorrow.",
        subheadlineBn: "আপনার বাসার জন্য সঠিক প্ল্যান বেছে নিন। আরও গতি, আরও মূল্য, আরও সংযুক্ত আগামী।",
        primaryCtaLabelEn: "Get Connection",
        primaryCtaLabelBn: "সংযোগ নিন",
        primaryCtaUrl: "/get-connection",
      }),
      list: { titleEn: "Our Home Internet Packages", titleBn: "আমাদের হোম ইন্টারনেট প্যাকেজ", subtitleEn: "High-speed internet for every home. Simple. Transparent. Reliable.", subtitleBn: "প্রতিটি বাসার জন্য হাই-স্পিড ইন্টারনেট। সহজ। স্বচ্ছ। নির্ভরযোগ্য।", noteEn: "Demo tariff — the ISP must verify prices, VAT and installation terms before launch.", noteBn: "ডেমো ট্যারিফ — চালুর আগে মূল্য, ভ্যাট ও ইনস্টলেশনের শর্ত যাচাই করতে হবে।" },
      help: {
        titleEn: "Not Sure Which Plan to Choose?",
        titleBn: "কোন প্ল্যান নেবেন বুঝতে পারছেন না?",
        subtitleEn: "We're here to help you find the perfect plan for your home.",
        subtitleBn: "আপনার বাসার জন্য সঠিক প্ল্যান খুঁজে পেতে আমরা সাহায্য করব।",
        items: [item("zap", "Compare Speeds", "গতি তুলনা করুন"), item("users", "Check Device Compatibility", "ডিভাইস সামঞ্জস্য দেখুন"), item("house", "Get Personalized Recommendations", "ব্যক্তিগত পরামর্শ নিন"), item("message-circle", "Talk to Our Experts", "বিশেষজ্ঞদের সাথে কথা বলুন")],
        ctaLabelEn: "Get Free Consultation",
        ctaLabelBn: "ফ্রি পরামর্শ নিন",
        ctaUrl: "/contact",
        scriptEn: "Same People, A Brighter Tomorrow",
        scriptBn: "একই মানুষ, উজ্জ্বল আগামী",
      },
      faq: { titleEn: "Frequently Asked Questions", titleBn: "সচরাচর জিজ্ঞাসা", subtitleEn: "Quick answers to help you choose the right plan.", subtitleBn: "সঠিক প্ল্যান বাছাইয়ে দ্রুত উত্তর।" },
      finalCta: { ...finalCta, headlineEn: "Get Connected Today", headlineBn: "আজই সংযোগ নিন", pointsEn: ["Free Installation", "No Hidden Charges", "Flexible Plans", "24/7 Support"], pointsBn: ["ফ্রি ইনস্টলেশন", "কোনো লুকানো চার্জ নেই", "নমনীয় প্ল্যান", "২৪/৭ সাপোর্ট"] },
    },
  },
  corporate: {
    titleEn: "Corporate",
    titleBn: "কর্পোরেট",
    sections: {
      hero: {
        ...hero({}),
        headlineEn: "Corporate",
        headlineBn: "কর্পোরেট",
        highlightEn: "Internet Solutions",
        highlightBn: "ইন্টারনেট সমাধান",
        eyebrowEn: "Reliable. Secure. Built for Your Business.",
        eyebrowBn: "নির্ভরযোগ্য। নিরাপদ। আপনার ব্যবসার জন্য।",
        subheadlineEn: "Empower your organization with high-speed dedicated internet, robust connectivity and 24/7 expert support.",
        subheadlineBn: "হাই-স্পিড ডেডিকেটেড ইন্টারনেট, শক্তিশালী সংযোগ ও ২৪/৭ বিশেষজ্ঞ সাপোর্টে আপনার প্রতিষ্ঠানকে এগিয়ে নিন।",
        primaryCtaLabelEn: "Request Corporate Connection",
        primaryCtaLabelBn: "কর্পোরেট সংযোগের অনুরোধ",
        primaryCtaUrl: "/corporate#inquiry",
        scriptEn: "A Stronger Connected Bangladesh",
        scriptBn: "আরও শক্তিশালী সংযুক্ত বাংলাদেশ",
        chips: [chip("users", "Dedicated Account Manager", "ডেডিকেটেড অ্যাকাউন্ট ম্যানেজার"), chip("shield-check", "SLA Options (on approval)", "এসএলএ (অনুমোদন সাপেক্ষে)"), chip("layers", "Scalable Solutions", "স্কেলেবল সমাধান"), chip("globe", "Nationwide Reach", "দেশব্যাপী সেবা")],
      },
      services: { titleEn: "Our Corporate Internet Services", titleBn: "আমাদের কর্পোরেট ইন্টারনেট সেবা", subtitleEn: "Tailored connectivity solutions to power your business", subtitleBn: "আপনার ব্যবসার জন্য উপযোগী সংযোগ সমাধান" },
      benefits: {
        titleEn: "Why Choose Us for Your Business?",
        titleBn: "ব্যবসার জন্য কেন আমরা?",
        subtitleEn: "More than internet — a trusted partner for your growth",
        subtitleBn: "শুধু ইন্টারনেট নয় — আপনার প্রবৃদ্ধির বিশ্বস্ত অংশীদার",
        items: [
          item("shield", "High Reliability", "উচ্চ নির্ভরযোগ্যতা", "Proactive monitoring of your link", "আপনার লিংকের সক্রিয় পর্যবেক্ষণ"),
          item("chart", "Scalable Bandwidth", "স্কেলেবল ব্যান্ডউইথ", "Grow your bandwidth as your business grows", "ব্যবসার সাথে ব্যান্ডউইথ বাড়ান"),
          item("users", "Business Support", "বিজনেস সাপোর্ট", "Dedicated account manager & priority care", "ডেডিকেটেড ম্যানেজার ও অগ্রাধিকার সেবা"),
          item("lock", "Secure Connectivity", "নিরাপদ সংযোগ", "Advanced security and isolation options", "উন্নত নিরাপত্তা ও আইসোলেশন"),
        ],
      },
      inquiry: {
        titleEn: "Request a Corporate Connection",
        titleBn: "কর্পোরেট সংযোগের অনুরোধ",
        subtitleEn: "Tell us about your business. Our team will get back to you shortly.",
        subtitleBn: "আপনার প্রতিষ্ঠান সম্পর্কে জানান। আমাদের টিম শীঘ্রই যোগাযোগ করবে।",
        scriptEn: "Your Business, Our Connection",
        scriptBn: "আপনার ব্যবসা, আমাদের সংযোগ",
        items: [],
      },
      trust: { titleEn: "", titleBn: "", subtitleEn: "", subtitleBn: "", items: [] },
      reviews: { titleEn: "What Our Business Clients Say", titleBn: "ব্যবসায়িক গ্রাহকদের মতামত", subtitleEn: "", subtitleBn: "" },
      faq: { titleEn: "Frequently Asked Questions", titleBn: "সচরাচর জিজ্ঞাসা", subtitleEn: "", subtitleBn: "" },
      finalCta: { ...finalCta, headlineEn: "Get a Custom Quote Today", headlineBn: "আজই কাস্টম কোটেশন নিন", messageEn: "Reliable internet. Expert support. A stronger Bangladesh.", messageBn: "নির্ভরযোগ্য ইন্টারনেট। বিশেষজ্ঞ সাপোর্ট। শক্তিশালী বাংলাদেশ।", pointsEn: ["Dedicated Solutions", "Priority Support", "Nationwide Coverage", "Scalable for Growth"], pointsBn: ["ডেডিকেটেড সমাধান", "প্রায়োরিটি সাপোর্ট", "দেশব্যাপী কভারেজ", "প্রবৃদ্ধির জন্য স্কেলেবল"], primaryCtaLabelEn: "Request Corporate Connection", primaryCtaLabelBn: "কর্পোরেট সংযোগের অনুরোধ", primaryCtaUrl: "/corporate#inquiry", secondaryCtaLabelEn: "", secondaryCtaLabelBn: "", secondaryCtaUrl: "" },
    },
  },
  coverage: {
    titleEn: "Coverage",
    titleBn: "কভারেজ",
    sections: {
      hero: hero({ headlineEn: "Our Coverage", headlineBn: "আমাদের কভারেজ", highlightEn: "Across Bangladesh", highlightBn: "বাংলাদেশজুড়ে", subheadlineEn: "Check whether our high-speed fiber internet is available at your address. We are expanding every month.", subheadlineBn: "আপনার ঠিকানায় আমাদের হাই-স্পিড ফাইবার ইন্টারনেট আছে কিনা দেখুন। আমরা প্রতি মাসে সম্প্রসারণ করছি।" }),
      checker: { titleEn: "Check Coverage in Your Area", titleBn: "আপনার এলাকায় কভারেজ দেখুন", subtitleEn: "Select your District, Thana/Upazila and Area.", subtitleBn: "জেলা, থানা/উপজেলা ও এলাকা নির্বাচন করুন।" },
      browse: { titleEn: "Browse Our Coverage", titleBn: "আমাদের কভারেজ এলাকা", subtitleEn: "Areas where our network is currently active.", subtitleBn: "যেসব এলাকায় আমাদের নেটওয়ার্ক বর্তমানে চালু আছে।" },
      stats: { titleEn: "Growing Every Day", titleBn: "প্রতিদিন বাড়ছে", subtitleEn: "", subtitleBn: "", items: statsItems },
      finalCta,
    },
  },
  "pay-bill": {
    titleEn: "Pay Bill",
    titleBn: "বিল পরিশোধ",
    sections: {
      hero: {
        ...hero({}),
        headlineEn: "Pay Your",
        headlineBn: "আপনার ইন্টারনেট",
        highlightEn: "Internet Bill",
        highlightBn: "বিল পরিশোধ করুন",
        eyebrowEn: "Stay connected without interruption",
        eyebrowBn: "নিরবচ্ছিন্ন সংযোগে থাকুন",
        subheadlineEn: "Follow the simple instructions below to pay your bill through bKash, Nagad, Rocket or direct bank transfer.",
        subheadlineBn: "বিকাশ, নগদ, রকেট বা সরাসরি ব্যাংক ট্রান্সফারে বিল পরিশোধ করতে নিচের সহজ নির্দেশনা অনুসরণ করুন।",
        chips: [chip("zap", "Fast & Secure Payments", "দ্রুত ও নিরাপদ পেমেন্ট"), chip("shield-check", "Multiple Payment Options", "একাধিক পেমেন্ট অপশন"), chip("receipt", "Keep Your Connection Active", "সংযোগ সক্রিয় রাখুন")],
      },
      notice: { titleEn: "Payment Instructions Only", titleBn: "শুধুমাত্র পেমেন্ট নির্দেশনা", bodyEn: "This page provides payment instructions for your convenience. It does not process payments directly. Please follow the steps below and complete your payment using your preferred method.", bodyBn: "এই পৃষ্ঠায় আপনার সুবিধার জন্য পেমেন্ট নির্দেশনা দেওয়া আছে। এখানে সরাসরি পেমেন্ট হয় না। নিচের ধাপ অনুসরণ করে পছন্দের মাধ্যমে পেমেন্ট করুন।", scriptEn: "Same Internet, A Stronger You", scriptBn: "একই ইন্টারনেট, আরও শক্তিশালী আপনি" },
      methods: { titleEn: "Choose Your Payment Method", titleBn: "পেমেন্ট পদ্ধতি বেছে নিন", subtitleEn: "Select your preferred payment method and follow the instructions carefully.", subtitleBn: "আপনার পছন্দের পেমেন্ট পদ্ধতি বেছে নিয়ে নির্দেশনা মনোযোগ দিয়ে অনুসরণ করুন।" },
      bank: { titleEn: "Bank Transfer", titleBn: "ব্যাংক ট্রান্সফার", subtitleEn: "You can also pay your bill directly to our bank accounts through online banking, mobile banking or by visiting any branch.", subtitleBn: "অনলাইন ব্যাংকিং, মোবাইল ব্যাংকিং বা শাখায় গিয়ে সরাসরি আমাদের ব্যাংক অ্যাকাউন্টে বিল দিতে পারেন।", noteEn: "Please use your Customer ID as the payment reference/narration while transferring from any bank. This helps us verify your payment quickly.", noteBn: "যেকোনো ব্যাংক থেকে ট্রান্সফারের সময় রেফারেন্স/বিবরণে কাস্টমার আইডি লিখুন। এতে দ্রুত যাচাই করা যায়।" },
      help: {
        titleEn: "Need Help with Your Payment?",
        titleBn: "পেমেন্টে সাহায্য দরকার?",
        subtitleEn: "Facing any issues or have questions? We're here to help.",
        subtitleBn: "কোনো সমস্যা বা প্রশ্ন আছে? আমরা সাহায্য করতে প্রস্তুত।",
        items: [
          item("message-circle", "Payment Not Reflecting?", "পেমেন্ট দেখাচ্ছে না?", "Learn what to do if your payment is not updated yet.", "পেমেন্ট আপডেট না হলে কী করবেন জানুন।", "/support"),
          item("file-text", "How to Find Customer ID?", "কাস্টমার আইডি কীভাবে পাবেন?", "Find your Customer ID from invoice, SMS or support.", "ইনভয়েস, এসএমএস বা সাপোর্ট থেকে কাস্টমার আইডি জানুন।", "/support"),
          item("help", "General Payment Guide", "সাধারণ পেমেন্ট গাইড", "Step-by-step guide for all payment methods.", "সব পেমেন্ট পদ্ধতির ধাপে ধাপে নির্দেশিকা।", "/support"),
          item("headphones", "Talk to Our Support Team", "সাপোর্ট টিমের সাথে কথা বলুন", "Get instant help from our customer care team.", "গ্রাহক সেবা টিমের কাছ থেকে দ্রুত সহায়তা নিন।", "/contact"),
        ],
        cardTitleEn: "We're Always Here for You",
        cardTitleBn: "আমরা সবসময় আপনার পাশে",
        cardBodyEn: "Your connection is our commitment.",
        cardBodyBn: "আপনার সংযোগই আমাদের অঙ্গীকার।",
      },
      finalCta: { ...finalCta, headlineEn: "Stay Connected, Always", headlineBn: "সবসময় সংযুক্ত থাকুন", messageEn: "Pay on time and enjoy uninterrupted high-speed internet to keep doing what you love.", messageBn: "সময়মতো বিল দিন এবং নিরবচ্ছিন্ন হাই-স্পিড ইন্টারনেট উপভোগ করুন।", pointsEn: ["No Service Interruption", "Fast Payment Verification", "Multiple Payment Options", "Dedicated Support"], pointsBn: ["সেবায় কোনো বিঘ্ন নেই", "দ্রুত পেমেন্ট যাচাই", "একাধিক পেমেন্ট অপশন", "ডেডিকেটেড সাপোর্ট"] },
    },
  },
  blog: {
    titleEn: "Blog",
    titleBn: "ব্লগ",
    sections: {
      hero: hero({ headlineEn: "Blog & Insights", headlineBn: "ব্লগ ও ইনসাইটস", subheadlineEn: "Explore expert insights, internet tips, industry news and stories — powering a smarter, more connected tomorrow.", subheadlineBn: "বিশেষজ্ঞ মতামত, ইন্টারনেট টিপস, খবর ও গল্প — আরও স্মার্ট ও সংযুক্ত আগামীর জন্য।", eyebrowEn: "Ideas. Updates. A Better Connected Bangladesh.", eyebrowBn: "ভাবনা। আপডেট। আরও সংযুক্ত বাংলাদেশ।", chips: [] }),
      story: { titleEn: "Have a story to share?", titleBn: "শেয়ার করার মতো গল্প আছে?", subtitleEn: "We'd love to hear how our internet is making a difference in your life or business.", subtitleBn: "আমাদের ইন্টারনেট আপনার জীবন বা ব্যবসায় কী পরিবর্তন এনেছে, জানাতে চাইলে লিখুন।", ctaLabelEn: "Tell Your Story", ctaLabelBn: "আপনার গল্প বলুন", ctaUrl: "/contact" },
    },
  },
  about: {
    titleEn: "About",
    titleBn: "আমাদের সম্পর্কে",
    sections: {
      hero: hero({ headlineEn: "About", headlineBn: "আমাদের", highlightEn: "SEBA IT Internet", highlightBn: "সম্পর্কে", subheadlineEn: "We connect homes and businesses with fast, reliable fiber internet and friendly local support.", subheadlineBn: "আমরা দ্রুত ও নির্ভরযোগ্য ফাইবার ইন্টারনেট এবং আন্তরিক স্থানীয় সাপোর্টের মাধ্যমে বাসা ও ব্যবসাকে সংযুক্ত করি।" }),
      story: {
        titleEn: "Our Story",
        titleBn: "আমাদের গল্প",
        bodyEn: "<p>SEBA IT Internet started with a simple goal: make dependable high-speed internet accessible to every home and business we serve. (Demo copy — replace with the ISP's real story.)</p><p>Today our fiber network, local technicians and support team work together so that families can learn, work and stay in touch — and businesses can grow with confidence.</p>",
        bodyBn: "<p>SEBA IT Internet একটি সহজ লক্ষ্য নিয়ে যাত্রা শুরু করে: আমাদের প্রতিটি গ্রাহকের বাসা ও ব্যবসায় নির্ভরযোগ্য হাই-স্পিড ইন্টারনেট পৌঁছে দেওয়া। (ডেমো লেখা — প্রকৃত তথ্য দিয়ে পরিবর্তন করুন।)</p><p>আজ আমাদের ফাইবার নেটওয়ার্ক, স্থানীয় টেকনিশিয়ান ও সাপোর্ট টিম একসাথে কাজ করে যাতে পরিবার শিখতে, কাজ করতে ও যুক্ত থাকতে পারে — আর ব্যবসা আত্মবিশ্বাসের সাথে এগোতে পারে।</p>",
      },
      missionVision: {
        missionEn: "To deliver fast, reliable and affordable internet with honest service and local support.",
        missionBn: "সৎ সেবা ও স্থানীয় সাপোর্টের মাধ্যমে দ্রুত, নির্ভরযোগ্য ও সাশ্রয়ী ইন্টারনেট পৌঁছে দেওয়া।",
        visionEn: "A more connected Bangladesh where every home and business can access world-class connectivity.",
        visionBn: "আরও সংযুক্ত বাংলাদেশ, যেখানে প্রতিটি বাসা ও ব্যবসা বিশ্বমানের সংযোগ পাবে।",
      },
      highlights: {
        titleEn: "Network Highlights",
        titleBn: "নেটওয়ার্কের বৈশিষ্ট্য",
        subtitleEn: "",
        subtitleBn: "",
        items: [
          item("cable", "Fiber to the Home", "বাসা পর্যন্ত ফাইবার", "Modern fiber infrastructure", "আধুনিক ফাইবার অবকাঠামো"),
          item("globe", "BDIX Connectivity", "বিডিআইএক্স কানেক্টিভিটি", "Fast local content delivery", "দ্রুত লোকাল কনটেন্ট"),
          item("activity", "Proactive Monitoring", "সক্রিয় পর্যবেক্ষণ", "Issues detected early", "সমস্যা আগেই শনাক্ত"),
          item("headphones", "Local Support Team", "স্থানীয় সাপোর্ট টিম", "Help in Bangla & English", "বাংলা ও ইংরেজিতে সহায়তা"),
        ],
      },
      stats: { titleEn: "", titleBn: "", subtitleEn: "", subtitleBn: "", items: [] },
      offices: { titleEn: "Our Offices", titleBn: "আমাদের অফিস", subtitleEn: "Visit us at our head office or nearest branch.", subtitleBn: "প্রধান কার্যালয় বা নিকটতম শাখায় আসুন।" },
      finalCta,
    },
  },
  support: {
    titleEn: "Support",
    titleBn: "সাপোর্ট",
    sections: {
      hero: hero({ headlineEn: "How Can We", headlineBn: "আমরা কীভাবে", highlightEn: "Help You?", highlightBn: "সাহায্য করতে পারি?", subheadlineEn: "Find answers to common questions or reach our support team through your preferred channel.", subheadlineBn: "সাধারণ প্রশ্নের উত্তর খুঁজুন বা পছন্দের চ্যানেলে আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।", chips: [] }),
      channels: { titleEn: "Need Help? We're Here for You", titleBn: "সাহায্য দরকার? আমরা আছি আপনার পাশে", subtitleEn: "Choose your preferred support channel", subtitleBn: "আপনার পছন্দের সাপোর্ট চ্যানেল বেছে নিন" },
      faq: { titleEn: "Frequently Asked Questions", titleBn: "সচরাচর জিজ্ঞাসা", subtitleEn: "Search or browse by category", subtitleBn: "খুঁজুন বা বিভাগ অনুযায়ী দেখুন" },
      finalCta: { ...finalCta, headlineEn: "Still Need Help?", headlineBn: "এখনো সাহায্য দরকার?", messageEn: "Send us a message and our team will get back to you.", messageBn: "আমাদের বার্তা পাঠান, আমাদের টিম যোগাযোগ করবে।", primaryCtaLabelEn: "Contact Us", primaryCtaLabelBn: "যোগাযোগ করুন", primaryCtaUrl: "/contact", secondaryCtaLabelEn: "Get Connection", secondaryCtaLabelBn: "সংযোগ নিন", secondaryCtaUrl: "/get-connection" },
    },
  },
  contact: {
    titleEn: "Contact",
    titleBn: "যোগাযোগ",
    sections: {
      hero: hero({ headlineEn: "Contact", headlineBn: "আমাদের সাথে", highlightEn: "Us", highlightBn: "যোগাযোগ করুন", subheadlineEn: "Questions about packages, coverage or billing? Our team is ready to help.", subheadlineBn: "প্যাকেজ, কভারেজ বা বিল নিয়ে প্রশ্ন? আমাদের টিম সাহায্য করতে প্রস্তুত।", chips: [] }),
      form: { titleEn: "Send Us a Message", titleBn: "আমাদের বার্তা পাঠান", subtitleEn: "We usually respond within one working day.", subtitleBn: "আমরা সাধারণত এক কর্মদিবসের মধ্যে উত্তর দিই।" },
      offices: { titleEn: "Our Offices", titleBn: "আমাদের অফিস", subtitleEn: "", subtitleBn: "" },
    },
  },
  "get-connection": {
    titleEn: "Get Connection",
    titleBn: "সংযোগ নিন",
    sections: {
      hero: hero({ headlineEn: "Get a New", headlineBn: "নতুন", highlightEn: "Connection", highlightBn: "সংযোগ নিন", subheadlineEn: "Fill in the form and our team will call you to confirm installation.", subheadlineBn: "ফর্মটি পূরণ করুন, ইনস্টলেশন নিশ্চিত করতে আমাদের টিম কল করবে।", chips: [] }),
      form: { titleEn: "Quick Get Connection Form", titleBn: "দ্রুত সংযোগ ফর্ম", subtitleEn: "Tell us a few details. We'll call you shortly!", subtitleBn: "কিছু তথ্য দিন, আমরা শীঘ্রই কল করব!" },
      steps: {
        titleEn: "Get Connected in 4 Steps",
        titleBn: "৪ ধাপে সংযোগ নিন",
        subtitleEn: "",
        subtitleBn: "",
        items: [
          item("zap", "Apply", "আবেদন", "Fill in the form online or call us", "অনলাইনে ফর্ম পূরণ করুন বা কল করুন"),
          item("file-text", "Verify", "যাচাই", "We'll verify your information", "আমরা আপনার তথ্য যাচাই করব"),
          item("users", "Install", "ইনস্টল", "Our team will install at your location", "আমাদের টিম আপনার ঠিকানায় ইনস্টল করবে"),
          item("wifi", "Enjoy", "উপভোগ", "Start enjoying high-speed internet", "হাই-স্পিড ইন্টারনেট উপভোগ শুরু করুন"),
        ],
      },
    },
  },
};

const LEGAL: Record<string, { titleEn: string; titleBn: string; en: string; bn: string }> = {
  privacy: {
    titleEn: "Privacy Policy",
    titleBn: "গোপনীয়তা নীতি",
    en: "<p><strong>Placeholder legal copy — must be reviewed and approved by the ISP/legal advisor before launch.</strong></p><h2>Information we collect</h2><p>When you request a connection, contact us or chat with us we collect the details you provide such as your name, mobile number, email and address. We do not collect national ID numbers through this website.</p><h2>How we use it</h2><p>We use your information only to respond to your request, provide service and support, and improve our network.</p><h2>Retention</h2><p>Lead, contact and chat records are retained for a limited period (default 24 months) unless the law requires otherwise.</p><h2>Contact</h2><p>For privacy questions please contact our support team.</p>",
    bn: "<p><strong>প্লেসহোল্ডার আইনি লেখা — চালুর আগে আইএসপি/আইন উপদেষ্টা কর্তৃক পর্যালোচনা ও অনুমোদন প্রয়োজন।</strong></p><h2>আমরা কী তথ্য সংগ্রহ করি</h2><p>সংযোগের অনুরোধ, যোগাযোগ বা চ্যাটের সময় আপনি যে তথ্য দেন — নাম, মোবাইল নম্বর, ইমেইল ও ঠিকানা — আমরা তা সংগ্রহ করি। এই ওয়েবসাইটে জাতীয় পরিচয়পত্র নম্বর সংগ্রহ করা হয় না।</p><h2>কীভাবে ব্যবহার করি</h2><p>শুধুমাত্র আপনার অনুরোধের উত্তর, সেবা ও সাপোর্ট প্রদান এবং নেটওয়ার্ক উন্নয়নে তথ্য ব্যবহার করা হয়।</p><h2>সংরক্ষণ</h2><p>আইনে ভিন্ন কিছু না থাকলে লিড, যোগাযোগ ও চ্যাটের তথ্য সীমিত সময় (ডিফল্ট ২৪ মাস) সংরক্ষিত থাকে।</p><h2>যোগাযোগ</h2><p>গোপনীয়তা বিষয়ে প্রশ্নের জন্য সাপোর্ট টিমে যোগাযোগ করুন।</p>",
  },
  terms: {
    titleEn: "Terms & Conditions",
    titleBn: "শর্তাবলী",
    en: "<p><strong>Placeholder legal copy — must be reviewed and approved before launch.</strong></p><h2>Service</h2><p>Internet service is provided subject to coverage availability, technical feasibility and applicable BTRC regulations.</p><h2>Billing</h2><p>Monthly charges are payable in advance as instructed on the Pay Bill page. Package prices and VAT are shown on the Packages page.</p><h2>Fair use</h2><p>Customers must not use the service for unlawful activity.</p>",
    bn: "<p><strong>প্লেসহোল্ডার আইনি লেখা — চালুর আগে পর্যালোচনা ও অনুমোদন প্রয়োজন।</strong></p><h2>সেবা</h2><p>কভারেজ, কারিগরি সম্ভাব্যতা ও প্রযোজ্য বিটিআরসি বিধিমালা সাপেক্ষে ইন্টারনেট সেবা প্রদান করা হয়।</p><h2>বিল</h2><p>বিল পরিশোধ পেজের নির্দেশনা অনুযায়ী মাসিক চার্জ অগ্রিম পরিশোধযোগ্য। প্যাকেজের মূল্য ও ভ্যাট প্যাকেজ পেজে দেওয়া আছে।</p><h2>ন্যায্য ব্যবহার</h2><p>বেআইনি কাজে সেবা ব্যবহার করা যাবে না।</p>",
  },
  "payment-policy": {
    titleEn: "Payment / Refund Policy",
    titleBn: "পেমেন্ট / রিফান্ড নীতি",
    en: "<p><strong>Placeholder legal copy — must be reviewed and approved before launch.</strong></p><h2>Payments</h2><p>This website provides payment instructions only and does not process payments. Always use your Customer ID as the reference.</p><h2>Refunds</h2><p>Refund eligibility is assessed case by case. Please contact support with your transaction ID.</p>",
    bn: "<p><strong>প্লেসহোল্ডার আইনি লেখা — চালুর আগে পর্যালোচনা ও অনুমোদন প্রয়োজন।</strong></p><h2>পেমেন্ট</h2><p>এই ওয়েবসাইট শুধু পেমেন্ট নির্দেশনা দেয়, সরাসরি পেমেন্ট প্রক্রিয়া করে না। সবসময় রেফারেন্স হিসেবে কাস্টমার আইডি দিন।</p><h2>রিফান্ড</h2><p>রিফান্ডের যোগ্যতা প্রতিটি ক্ষেত্রে আলাদাভাবে বিবেচনা করা হয়। ট্রানজেকশন আইডিসহ সাপোর্টে যোগাযোগ করুন।</p>",
  },
};

async function seedPages() {
  for (const [key, p] of Object.entries(PAGES)) {
    const page = await db.page.upsert({ where: { key }, update: {}, create: { key, titleEn: p.titleEn, titleBn: p.titleBn, status: "PUBLISHED" } });
    let order = 1;
    for (const [type, data] of Object.entries(p.sections)) {
      await db.pageSection.upsert({
        where: { pageId_type: { pageId: page.id, type } },
        update: {},
        create: { pageId: page.id, type, data: data as Prisma.InputJsonValue, displayOrder: order++, enabled: true },
      });
    }
  }
  for (const [key, l] of Object.entries(LEGAL)) {
    await db.page.upsert({ where: { key }, update: {}, create: { key, titleEn: l.titleEn, titleBn: l.titleBn, contentEn: l.en, contentBn: l.bn, status: "PUBLISHED" } });
  }
}

async function seedSeo() {
  const entries: Array<[string, string, string, string, string]> = [
    ["home", "", "", "Fast, reliable fiber internet for homes and businesses in Bangladesh. Check coverage, compare packages and get connected.", "বাংলাদেশে বাসা ও ব্যবসার জন্য দ্রুত ও নির্ভরযোগ্য ফাইবার ইন্টারনেট। কভারেজ দেখুন, প্যাকেজ তুলনা করুন ও সংযোগ নিন।"],
    ["packages", "Home Internet Packages", "হোম ইন্টারনেট প্যাকেজ", "Compare our home internet packages — clear speeds, monthly prices and VAT notes.", "আমাদের হোম ইন্টারনেট প্যাকেজ তুলনা করুন — স্পষ্ট গতি, মাসিক মূল্য ও ভ্যাট তথ্য।"],
    ["corporate", "Corporate Internet Solutions", "কর্পোরেট ইন্টারনেট সমাধান", "Dedicated internet, static IP, redundancy and managed network for businesses.", "ব্যবসার জন্য ডেডিকেটেড ইন্টারনেট, স্ট্যাটিক আইপি, রিডান্ড্যান্সি ও ম্যানেজড নেটওয়ার্ক।"],
    ["coverage", "Coverage Checker", "কভারেজ চেকার", "Check if our fiber internet is available in your district, thana and area.", "আপনার জেলা, থানা ও এলাকায় আমাদের ফাইবার ইন্টারনেট আছে কিনা দেখুন।"],
    ["pay-bill", "Pay Your Internet Bill", "ইন্টারনেট বিল পরিশোধ", "Payment instructions for bKash, Nagad, Rocket and bank transfer.", "বিকাশ, নগদ, রকেট ও ব্যাংক ট্রান্সফারে বিল পরিশোধের নির্দেশনা।"],
    ["blog", "Blog & Insights", "ব্লগ ও ইনসাইটস", "Internet tips, technology updates and company news.", "ইন্টারনেট টিপস, প্রযুক্তি ও কোম্পানির খবর।"],
    ["about", "About Us", "আমাদের সম্পর্কে", "Learn about our story, mission, vision and offices.", "আমাদের গল্প, লক্ষ্য, স্বপ্ন ও অফিস সম্পর্কে জানুন।"],
    ["support", "Support & FAQ", "সাপোর্ট ও জিজ্ঞাসা", "Get help by live chat, phone or email and find answers to common questions.", "লাইভ চ্যাট, ফোন বা ইমেইলে সহায়তা নিন এবং সাধারণ প্রশ্নের উত্তর খুঁজুন।"],
    ["contact", "Contact Us", "যোগাযোগ", "Contact our team or visit our head office and branches.", "আমাদের টিমের সাথে যোগাযোগ করুন বা অফিসে আসুন।"],
    ["get-connection", "Get a New Connection", "নতুন সংযোগ নিন", "Request a new home or corporate internet connection online.", "অনলাইনে নতুন হোম বা কর্পোরেট ইন্টারনেট সংযোগের অনুরোধ করুন।"],
  ];
  for (const [routeKey, titleEn, titleBn, descriptionEn, descriptionBn] of entries) {
    await db.seoEntry.upsert({
      where: { routeKey },
      update: {},
      create: { routeKey, titleEn: titleEn || null, titleBn: titleBn || null, descriptionEn, descriptionBn, indexable: true },
    });
  }
}

async function main() {
  assertSafety();
  const admin = await seedRbac();
  await seedBrand();
  await seedNavigation();
  await seedPackages();
  await seedCorporate();
  await seedCoverage();
  await seedPayments();
  await seedFaqs();
  await seedReviews();
  await seedOffer();
  await seedOffices();
  await seedBlog(admin.id);
  await seedPages();
  await seedSeo();
  console.log(`✔ Seed complete.\n  Dashboard: ${process.env.APP_URL ?? "http://localhost:3000"}/admin\n  Email:     ${admin.email}\n  Password:  (DEMO_ADMIN_PASSWORD from your .env)`);
}

main()
  .catch((e) => {
    console.error("✖ Seed failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
