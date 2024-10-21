import { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import {
  getHomePage,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserInfoById,
  getUserById,
} from "../controllers/userController";
import { BadRequestError, NotFoundError } from "../utils/errorHandler";
import { sendResponse } from "../utils/response";

export const router = async (req: IncomingMessage, res: ServerResponse) => {
  const { method, url, headers } = req;
  const { pathname, searchParams } = new URL(url!, `http://${headers.host}`);

  try {
    if (method === "GET" && pathname === "/") {
      await getHomePage(res);
    } else if (method === "GET" && pathname === "/users") {
      await getUsers(req, res, searchParams);
    } else if (method === "GET" && pathname.startsWith("/users/data/")) {
      const userId = pathname.split("/")[3] as string;
      await getUserInfoById(res, userId);
    } else if (method === "GET" && pathname.startsWith("/users/")) {
      const userId = pathname.split("/")[2] as string;
      await getUserById(res, userId);
    } else if (method === "POST" && pathname === "/users") {
      await createUser(req, res);
    } else if (
      (method === "PUT" || method === "PATCH") &&
      pathname.startsWith("/users/")
    ) {
      const userId = pathname.split("/")[2] as string;
      const isPartial = method === "PATCH";
      await updateUser(req, res, userId, isPartial);
    } else if (method === "DELETE" && pathname.startsWith("/users/")) {
      const userId = pathname.split("/")[2] as string;
      await deleteUser(res, userId);
    } else {
      throw new NotFoundError("Route not found");
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      sendResponse(res, 404, { message: error.message });
    } else if (error instanceof BadRequestError) {
      sendResponse(res, 400, { message: error.message });
    } else {
      sendResponse(res, 500, { message: "Internal Server Error" });
    }
  }
};
