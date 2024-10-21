import { ServerResponse } from "node:http";

export const sendResponse = (
  res: ServerResponse,
  statusCode: number,
  data: any,
  contentType = "application/json",
) => {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(contentType === "application/json" ? JSON.stringify(data) : data);
};
