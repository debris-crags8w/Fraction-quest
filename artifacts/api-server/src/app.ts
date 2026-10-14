import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Behind the hosting proxy: needed for correct client IPs (rate limits) and secure cookies.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Log unexpected errors (with the stack, to the permanent log only) and return a generic 500.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, method: req.method, path: req.path, ip: req.ip }, "Unhandled request error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Something went wrong." });
});

export default app;
