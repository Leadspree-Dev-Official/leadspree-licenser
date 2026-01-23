import { z } from "zod";

// License form validation schema
export const licenseFormSchema = z.object({
  software_id: z.string().uuid("Please select a valid software"),
  buyer_name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-'.]+$/, "Name contains invalid characters"),
  buyer_email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  buyer_phone: z
    .string()
    .trim()
    .max(20, "Phone must be less than 20 characters")
    .regex(/^[\d\s\-+()]*$/, "Phone contains invalid characters")
    .optional()
    .or(z.literal("")),
  platform: z
    .string()
    .trim()
    .max(50, "Platform must be less than 50 characters")
    .optional()
    .or(z.literal("")),
  account_type: z.enum(["buyer", "demo"]),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  amount: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || !isNaN(parseFloat(val)), "Amount must be a valid number")
    .refine((val) => !val || parseFloat(val) >= 0, "Amount must be positive"),
  pay_mode: z.enum(["", "UPI", "Bank", "Cash", "Crypto"]).optional(),
  reseller_id: z.string().uuid().optional().or(z.literal("")),
  remarks: z
    .string()
    .trim()
    .max(500, "Remarks must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  extension_id: z
    .string()
    .trim()
    .max(100, "Extension ID must be less than 100 characters")
    .optional()
    .or(z.literal("")),
});

export type LicenseFormData = z.infer<typeof licenseFormSchema>;

// Validate and sanitize license form data
export function validateLicenseForm(data: Record<string, unknown>): {
  success: boolean;
  data?: LicenseFormData;
  errors?: Record<string, string>;
} {
  const result = licenseFormSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join(".");
    if (path && !errors[path]) {
      errors[path] = err.message;
    }
  });

  return { success: false, errors };
}
