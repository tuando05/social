import { ApiError } from "../middleware/error.middleware";

export type CursorInput = {
  cursor?: string;
  limit?: string | number;
};

export const getPagination = ({ cursor, limit }: CursorInput) => {
  const parsedLimit = Number(limit ?? 10);

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
    throw new ApiError(400, "limit must be an integer between 1 and 50");
  }

  return {
    cursor,
    limit: parsedLimit,
  };
};
