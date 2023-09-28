import { isAddress } from "ethers";
import { z } from "zod";

export const {
  PROVIDER_URL,
  RECIPIENT
} = z.object({
  PROVIDER_URL: z.string().url(),
  RECIPIENT: z.string().refine(isAddress, 'Invalid address'),
}).parse(process.env);