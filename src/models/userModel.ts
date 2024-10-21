import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TUser } from "../types/userTypes";
import { InternalServerError } from "../utils/errorHandler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "../../db/users.json");

export const loadUsers = async (): Promise<TUser[]> => {
  try {
    const data = await readFile(DB_PATH, "utf-8");
    return JSON.parse(data) as TUser[];
  } catch (err) {
    throw new InternalServerError("Failed to load users from file.");
  }
};

export const saveUsers = async (users: TUser[]): Promise<void> => {
  try {
    await writeFile(DB_PATH, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    throw new InternalServerError("Failed to save users to file.");
  }
};
