import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  street: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zip: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const jobSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  customerId: z.string().min(1, "Customer is required"),
  assignedToId: z.string().optional().or(z.literal("")),
  status: z.enum([
    "UNSCHEDULED",
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ]),
  scheduledStart: z.string().optional().or(z.literal("")),
  scheduledEnd: z.string().optional().or(z.literal("")),
  street: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zip: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const techJobUpdateSchema = z.object({
  status: z.enum([
    "UNSCHEDULED",
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ]),
  notes: z.string().optional().or(z.literal("")),
});

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "DISPATCHER", "TECH"]),
  phone: z.string().optional().or(z.literal("")),
});
