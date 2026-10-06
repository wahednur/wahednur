import { z } from "zod";

export const portfolioSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  dsc: z.string().min(10, "Description is too short"),
  img: z.string().url({ message: "Must be a valid image URL" }),
  live: z.string().url().optional(),
  git: z.string().url().optional(),
  tags: z.array(z.string().min(1, "Tag can't be empty")),
  technology: z.array(z.string().min(1, "Technology can't be empty")),
  case: z.string(),
});

export type PortfolioFormType = z.infer<typeof portfolioSchema>;
