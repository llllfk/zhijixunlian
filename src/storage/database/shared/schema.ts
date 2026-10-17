import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, text, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户档案（扩展 Supabase auth.users，存姓名/角色/启用状态）
export const userProfiles = pgTable(
	"user_profiles",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		email: varchar("email", { length: 255 }),
		phone: varchar("phone", { length: 20 }),
		password_hash: text("password_hash").notNull(),
		name: varchar("name", { length: 128 }).notNull(),
		role: varchar("role", { length: 20 }).notNull().default("user"), // user | admin
		is_active: boolean("is_active").notNull().default(true),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("user_profiles_role_idx").on(table.role),
		index("user_profiles_active_idx").on(table.is_active),
	]
);

// 旅客画像（管理后台维护，学员选择）
export const passengerProfiles = pgTable(
	"passenger_profiles",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		name: varchar("name", { length: 100 }).notNull(),
		description: text("description"),
		background_url: text("background_url"),
		is_active: boolean("is_active").notNull().default(true),
		sort_order: integer("sort_order").notNull().default(0),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("passenger_profiles_active_idx").on(table.is_active),
		index("passenger_profiles_sort_idx").on(table.sort_order),
	]
);

// 训练记录（一次通话 + 评价结果）
export const trainingRecords = pgTable(
	"training_records",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		user_id: varchar("user_id", { length: 36 }).notNull(),
		profile_id: varchar("profile_id", { length: 36 }).references(() => passengerProfiles.id),
		profile_name: varchar("profile_name", { length: 100 }),
		status: varchar("status", { length: 20 }).notNull().default("completed"), // completed | failed
		duration_seconds: integer("duration_seconds").notNull().default(0),
		score: integer("score"), // 总分 0-100
		scores: jsonb("scores"), // { 维度: 分数 }
		result: jsonb("result"), // { dimensions, suggestions, transcript, ... }
		started_at: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("training_records_user_idx").on(table.user_id),
		index("training_records_profile_idx").on(table.profile_id),
		index("training_records_created_at_idx").on(table.created_at),
	]
);