export type ProfileLike = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  specialty?: string | null;
  country?: string | null;
} | null | undefined;

const filled = (v?: string | null) => !!v && v.trim().length > 0;

/** Fields required to earn the verification tick, per account type. */
export const requiredFields = (isCreator: boolean) =>
  isCreator
    ? (["display_name", "username", "avatar_url", "bio", "specialty"] as const)
    : (["display_name", "username", "avatar_url", "bio"] as const);

export const fieldLabels: Record<string, string> = {
  display_name: "Full name",
  username: "Username",
  avatar_url: "Profile photo",
  bio: "Short bio",
  specialty: "Signature cuisine",
  country: "Country",
};

/** Which required fields are still empty. */
export const missingFields = (profile: ProfileLike, isCreator: boolean): string[] =>
  requiredFields(isCreator).filter((f) => !filled((profile as any)?.[f]));

/** A profile is "complete" (and therefore verified) when nothing is missing. */
export const isProfileComplete = (profile: ProfileLike, isCreator: boolean): boolean =>
  missingFields(profile, isCreator).length === 0;

/** 0-100 completion percentage, used for the progress bar. */
export const profileCompletion = (profile: ProfileLike, isCreator: boolean): number => {
  const fields = requiredFields(isCreator);
  const done = fields.length - missingFields(profile, isCreator).length;
  return Math.round((done / fields.length) * 100);
};
