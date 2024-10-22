import {
  getHomePageService,
  getUsersService,
  getUserInfoByIdService,
  getUserByIdService,
  createUserService,
  updateUserService,
  deleteUserService,
} from "../services/userService";
import { sendResponse } from "../utils/response";
import { ServerResponse, IncomingMessage } from "node:http";
import { URLSearchParams } from "url";

export const getHomePage = async (res: ServerResponse) => {
  const homePage = await getHomePageService();
  sendResponse(res, 200, homePage, "text/html");
};

export const getUsers = async (
  _req: IncomingMessage,
  res: ServerResponse,
  searchParams: URLSearchParams,
) => {
  const { data, type } = await getUsersService(searchParams);
  sendResponse(res, 200, data, type);
};

export const getUserInfoById = async (res: ServerResponse, userId: string) => {
  const user = await getUserInfoByIdService(userId);
  sendResponse(res, 200, user);
};

export const getUserById = async (res: ServerResponse, userId: string) => {
  const { userFile } = await getUserByIdService(userId);
  sendResponse(res, 200, userFile, "text/html");
};

export const createUser = async (req: IncomingMessage, res: ServerResponse) => {
  const newUser = await createUserService(req);
  sendResponse(res, 201, newUser);
};

export const updateUser = async (
  req: IncomingMessage,
  res: ServerResponse,
  userId: string,
  isPartial: boolean,
) => {
  const updatedUser = await updateUserService(req, userId, isPartial);
  sendResponse(res, 200, updatedUser);
};

export const deleteUser = async (res: ServerResponse, userId: string) => {
  await deleteUserService(userId);
  sendResponse(res, 200, {
    message: `User with ID ${userId} deleted successfully`,
  });
};
