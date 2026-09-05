import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  changePasswordController,
  loginController,
  logoutController,
  meController,
  registerController,
  updateProfileController,
} from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", registerController);
authRouter.post("/login", loginController);
authRouter.post("/logout", logoutController);
authRouter.get("/me", requireAuth, meController);
authRouter.patch("/profile", requireAuth, updateProfileController);
authRouter.patch("/password", requireAuth, changePasswordController);
