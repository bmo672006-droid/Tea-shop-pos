import { z } from "zod";

export const orderItemSchema = z.object({
  menuItemId: z.string().uuid("Invalid menu item ID"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  notes: z.string().max(500).optional(),
});

export const createOrderSchema = z.object({
  tableId: z.string().uuid("Invalid table ID").optional(),
  type: z.enum(["DINE_IN", "PARCEL"]),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

export const updateOrderItemsSchema = z.object({
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

export const orderQuerySchema = z.object({
  tableId: z.string().uuid().optional(),
  waiterId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "COOKING", "READY", "COMPLETED"]).optional(),
});

export const paramIdSchema = z.object({
  id: z.string().uuid("Invalid order ID"),
});

export const createOrderInputSchema = createOrderSchema.strict();
export const updateOrderItemsInputSchema = updateOrderItemsSchema.strict();
export const orderQueryInputSchema = orderQuerySchema.strict();
export const paramIdInputSchema = paramIdSchema.strict();

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type UpdateOrderItemsInput = z.infer<typeof updateOrderItemsInputSchema>;
export type OrderQueryInput = z.infer<typeof orderQueryInputSchema>;
export type ParamIdInput = z.infer<typeof paramIdInputSchema>;