export const CATEGORIES = ["ideas", "intentions", "commitments", "projects", "wishes"] as const;
export type Category = (typeof CATEGORIES)[number];
