import { z } from "zod";
import i18n from "@/src/i18n";

export const valid = {
  twoFaMethods: ["email", "authenticator"],
};

export const schemas = {
  user: {
    email: z.email(i18n.t("common.validation.invalidEmail")),
    password: z
      .string()
      .min(8, i18n.t("common.validation.passwordTooShort"))
      .max(256),
    name: z
      .string()
      .trim()
      .min(1, i18n.t("common.validation.required"))
      .max(50, i18n.t("common.validation.nameTooLong"))
      .regex(/^[a-zA-Z\s]+$/, i18n.t("common.validation.invalidName")),
    surname: z
      .string()
      .trim()
      .min(1, i18n.t("common.validation.required"))
      .regex(/^[a-zA-Z\s]+$/, i18n.t("common.validation.invalidName")),
  },
  chat: {
    name: z.string().trim().min(3).max(50),
  },
  handle: z
    .string()
    .min(3, i18n.t("common.validation.handleTooShort"))
    .max(15, i18n.t("common.validation.handleTooLong"))
    .regex(
      /^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/,
      i18n.t("common.validation.invalidHandle"),
    )
    .refine(
      (v) => !v.includes("__"),
      i18n.t("common.validation.handleConsecutiveUnderscores"),
    ),
  twofa: {
    code: z.string().length(6).regex(/^\d+$/),
  },
};

const parse = (schema, value) => {
  const res = schema.safeParse(value);
  if (res.success) return { success: true };
  const message =
    res.error.issues?.[0]?.message || i18n.t("common.validation.invalidInput");
  return { success: false, error: message };
};

export const validate = {
  user: {
    email: (v) => parse(schemas.user.email, v),
    password: (v) => parse(schemas.user.password, v),
    name: (v) => parse(schemas.user.name, v),
    surname: (v) => parse(schemas.user.surname, v),
  },
  chat: {
    name: (v) => parse(schemas.chat.name, v),
  },
  handle: (v) => parse(schemas.handle, v),
  twofa: {
    code: (v) => parse(schemas.twofa.code, v),
  },
};
