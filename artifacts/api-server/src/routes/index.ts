import { Router, type IRouter } from "express";
import healthRouter from "./health";
import nowRouter from "./now";

const router: IRouter = Router();

router.use(healthRouter);
router.use(nowRouter);

export default router;
