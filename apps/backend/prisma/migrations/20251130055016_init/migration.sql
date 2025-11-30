-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastConnected" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectionCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whales" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3),
    "riskLevel" TEXT DEFAULT 'medium',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "whales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_whales" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whaleId" TEXT NOT NULL,
    "trackedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "user_whales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whale_activities" (
    "id" TEXT NOT NULL,
    "whaleId" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "blockHeight" BIGINT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "balanceChange" TEXT,
    "metadata" JSONB,

    CONSTRAINT "whale_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_address_key" ON "users"("address");

-- CreateIndex
CREATE UNIQUE INDEX "whales_address_key" ON "whales"("address");

-- CreateIndex
CREATE UNIQUE INDEX "user_whales_userId_whaleId_key" ON "user_whales"("userId", "whaleId");

-- CreateIndex
CREATE UNIQUE INDEX "whale_activities_transactionHash_key" ON "whale_activities"("transactionHash");

-- AddForeignKey
ALTER TABLE "user_whales" ADD CONSTRAINT "user_whales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_whales" ADD CONSTRAINT "user_whales_whaleId_fkey" FOREIGN KEY ("whaleId") REFERENCES "whales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whale_activities" ADD CONSTRAINT "whale_activities_whaleId_fkey" FOREIGN KEY ("whaleId") REFERENCES "whales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
