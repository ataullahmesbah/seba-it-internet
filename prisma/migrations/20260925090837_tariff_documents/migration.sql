-- CreateTable
CREATE TABLE "TariffDocument" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionBn" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "memoNumber" TEXT,
    "issuedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TariffDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TariffDocument_active_displayOrder_idx" ON "TariffDocument"("active", "displayOrder");
