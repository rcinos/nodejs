import { loadUsers, saveUsers } from "../models/userModel";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { NotFoundError, BadRequestError } from "../utils/errorHandler";
import { logger } from "../utils/logger";
import { User } from "../types/userTypes";
import { IncomingMessage } from "node:http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userSchema = z.object({
  name: z.string().trim(),
  age: z.number().int().min(0),
});

export const getHomePageService = async () => {
  return readFile(path.join(__dirname, "../views/home.html"), "utf-8");
};

export const getUsersService = async (searchParams: URLSearchParams) => {
  const users = await loadUsers();
  let filteredUsers = users;

  if (searchParams.has("name")) {
    filteredUsers = filteredUsers.filter(
      (user) => user.name === searchParams.get("name"),
    );
  }
  if (searchParams.has("minAge")) {
    filteredUsers = filteredUsers.filter(
      (user) => user.age >= Number(searchParams.get("minAge")),
    );
  }
  if (searchParams.has("maxAge")) {
    filteredUsers = filteredUsers.filter(
      (user) => user.age <= Number(searchParams.get("maxAge")),
    );
  }

  return Array.from(searchParams.keys()).length > 0
    ? { data: filteredUsers, type: "application/json" }
    : {
        data: await readFile(
          path.join(__dirname, "../views/form.html"),
          "utf-8",
        ),
        type: "text/html",
      };
};

export const getUserInfoByIdService = async (userId: string) => {
  const users = await loadUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new NotFoundError("User not found");
  return user;
};

export const getUserByIdService = async (userId: string) => {
  const users = await loadUsers();
  const user = users.find((u) => u.id === userId);
  const userFile = await readFile(
    path.join(__dirname, "../views/user.html"),
    "utf-8",
  );

  if (!user) throw new NotFoundError("User not found");

  return { user, userFile };
};

export const createUserService = async (req: IncomingMessage) => {
  let body = "";
  for await (const chunk of req) body += chunk;

  const contentType = req.headers["content-type"];
  const parsedData =
    contentType === "application/json"
      ? JSON.parse(body)
      : Object.fromEntries(new URLSearchParams(body));

  parsedData.age = +parsedData.age;
  const { success, data } = userSchema.safeParse(parsedData);
  if (!success) throw new BadRequestError("Invalid user data");

  const users = await loadUsers();
  const newId = String(Number(users[users.length - 1]?.id || 0) + 1);

  const newUser: User = { id: newId, name: data.name, age: data.age };
  users.push(newUser);
  await saveUsers(users);
  logger.info(`User created: ${JSON.stringify(newUser)}`);
  return newUser;
};

export const updateUserService = async (
  req: IncomingMessage,
  userId: string,
  isPartial: boolean,
) => {
  let body = "";
  for await (const chunk of req) body += chunk;

  const parsedData = JSON.parse(body);
  const users = await loadUsers();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) throw new NotFoundError("User not found");

  const updatedData = isPartial
    ? { ...users[userIndex], ...parsedData }
    : { id: userId, ...parsedData };

  const { success } = userSchema.safeParse(updatedData);
  if (!success) throw new BadRequestError("Invalid user data");

  users[userIndex] = updatedData;
  await saveUsers(users);
  logger.info(`User updated: ${JSON.stringify(updatedData)}`);
  return updatedData;
};

export const deleteUserService = async (userId: string) => {
  const users = await loadUsers();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) throw new NotFoundError("User not found");

  users.splice(userIndex, 1);
  await saveUsers(users);
  logger.info(`User with ID ${userId} deleted`);
};
