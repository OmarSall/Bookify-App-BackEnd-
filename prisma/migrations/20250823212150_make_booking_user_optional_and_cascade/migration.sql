-- Make userId nullable
ALTER TABLE "public"."Booking"
    ALTER COLUMN "userId" DROP NOT NULL;

-- Replace FK to support ON DELETE SET NULL
ALTER TABLE "public"."Booking"
    DROP CONSTRAINT IF EXISTS "Booking_userId_fkey";

ALTER TABLE "public"."Booking"
    ADD CONSTRAINT "Booking_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
