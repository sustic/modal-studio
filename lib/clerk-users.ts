import { clerkClient } from "@clerk/nextjs/server";

/**
 * Given an array of Clerk user IDs, returns a map of { userId → fullName }.
 * Deduplicates IDs before fetching. Falls back to "Unknown" for any ID that
 * cannot be resolved.
 */
export async function getUserNames(
  userIds: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))];

  if (unique.length === 0) return new Map();

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({
    userId: unique,
    limit: unique.length,
  });

  const map = new Map<string, string>();
  for (const user of users) {
    const full = [user.firstName, user.lastName].filter(Boolean).join(" ");
    map.set(user.id, full || user.emailAddresses[0]?.emailAddress || "Unknown");
  }

  return map;
}
