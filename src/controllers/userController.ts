import { IncomingMessage, ServerResponse } from "node:http";
import { loadUsers, saveUsers } from "../models/userModel";
import { sendResponse } from "../utils/response";
import { TUser } from "../types/userTypes";
import Joi from "joi";
import { NotFoundError, BadRequestError } from "../utils/errorHandler";
import { logger } from "../utils/logger";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userSchema = Joi.object({
  id: Joi.string(),
  name: Joi.string().trim().required(),
  age: Joi.number().integer().min(0).required(),
});

export const getHomePage = async (res: ServerResponse) => {
  try {
    const homePage = await readFile(
      path.join(__dirname, "../views/home.html"),
      "utf-8",
    );
    sendResponse(res, 200, homePage, "text/html");
  } catch (err) {
    throw new Error("Error reading home.html");
  }
};

export const getUsers = async (
  _req: IncomingMessage,
  res: ServerResponse,
  searchParams: URLSearchParams,
) => {
  const users = await loadUsers();

  if (searchParams && [...searchParams.keys()].length > 0) {
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

    sendResponse(res, 200, filteredUsers);
  } else {
    try {
      const form = await readFile(
        path.join(__dirname, "../views/form.html"),
        "utf-8",
      );
      sendResponse(res, 200, form, "text/html");
    } catch (err) {
      throw new Error("Error reading form.html");
    }
  }
};

export const getUserInfoById = async (res: ServerResponse, userId: string) => {
  const users = await loadUsers();
  const user = users.find((u) => u.id === userId);
  if (user) {
    sendResponse(res, 200, user);
  } else {
    throw new NotFoundError("User not found");
  }
};

export const getUserById = async (res: ServerResponse, userId: string) => {
  const users = await loadUsers();
  const user = users.find((u) => u.id === userId);
  const userFile = await readFile(
    path.join(__dirname, "../views/user.html"),
    "utf-8",
  );

  if (user) {
    sendResponse(res, 200, userFile, "text/html");
  } else {
    throw new NotFoundError("User not found");
  }
};

export const createUser = async (req: IncomingMessage, res: ServerResponse) => {
  let body = "";

  for await (const chunk of req) {
    body += chunk;
  }

  const contentType = req.headers["content-type"];

  let parsedData: any;
  if (contentType === "application/json") {
    parsedData = JSON.parse(body);
  } else if (contentType === "application/x-www-form-urlencoded") {
    parsedData = Object.fromEntries(new URLSearchParams(body));
  } else {
    throw new BadRequestError("Unsupported Content-Type");
  }

  const { error, value } = userSchema.validate(parsedData);
  if (error) {
    throw new BadRequestError("Invalid user data");
  }

  const users = await loadUsers();
  const newId = String(Number(users[users.length - 1]?.id || 0) + 1);

  const newUser: TUser = {
    id: newId,
    name: value.name,
    age: value.age,
  };

  users.push(newUser);
  await saveUsers(users);

  logger.info(`User created: ${JSON.stringify(newUser)}`);
  sendResponse(res, 201, newUser);
};

export const updateUser = async (
  req: IncomingMessage,
  res: ServerResponse,
  userId: string,
  isPartial: boolean,
) => {
  let body = "";

  for await (const chunk of req) {
    body += chunk;
  }

  const parsedData = JSON.parse(body);
  const users = await loadUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    throw new NotFoundError("User not found");
  }

  const existingUser = users[userIndex];
  const updatedData = isPartial
    ? { ...existingUser, ...parsedData }
    : { id: userId, ...parsedData };

  const { error } = userSchema.validate(updatedData);
  if (error) {
    throw new BadRequestError("Invalid user data");
  }

  users[userIndex] = updatedData;
  await saveUsers(users);

  logger.info(`User updated: ${JSON.stringify(updatedData)}`);
  sendResponse(res, 200, updatedData);
};

export const deleteUser = async (res: ServerResponse, userId: string) => {
  const users = await loadUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    throw new NotFoundError("User not found");
  }

  users.splice(userIndex, 1);
  await saveUsers(users);

  logger.info(`User with ID ${userId} deleted`);
  sendResponse(res, 200, {
    message: `User with ID ${userId} deleted successfully`,
  });
};
