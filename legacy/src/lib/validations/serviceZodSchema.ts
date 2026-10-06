// validations/serviceSchema.ts
import { z } from "zod";

export const serviceSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  dsc: z.string().min(10, "Description is too short"),
  img: z.string().url({ message: "Must be a valid image URL" }),
  related: z.array(z.string()),
});

export type ServiceFormType = z.infer<typeof serviceSchema>;
