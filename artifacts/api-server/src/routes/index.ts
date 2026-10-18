import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import progressRouter from "./progress";
import familyRouter from "./family";
import privacyRouter from "./privacy";
import voiceRouter from "./voice";
import adminRouter from "./admin";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(authRouter);
router.use(progressRouter);
// Voice is public so guest learners can use it; mount it before routers with session-wide auth middleware.
router.use(voiceRouter);
router.use(storageRouter);
router.use(familyRouter);
router.use(privacyRouter);

export default router;
