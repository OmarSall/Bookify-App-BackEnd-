-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."Favourite" (
    "userId" INT NOT NULL,
    "venueId" INT NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT "Favourite_pkey" PRIMARY KEY ("userId","venueId"),

    CONSTRAINT "Favourite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES public."User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Favourite_venueId_fkey"
    FOREIGN KEY ("venueId") REFERENCES public."Venue" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Favourite_userId_idx"
    ON public."Favourite" ("userId");
CREATE INDEX IF NOT EXISTS "Favourite_venueId_idx"
    ON public."Favourite" ("venueId");

ALTER TABLE public."Feature"
    RENAME CONSTRAINT "Feature_name_uq" TO "Feature_name_key";
