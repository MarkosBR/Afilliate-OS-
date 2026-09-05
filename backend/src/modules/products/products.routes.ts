import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  createProductController,
  deleteProductController,
  getProductController,
  listProductsController,
  updateProductController,
} from "./products.controller.js";

export const productsRouter = Router();

productsRouter.use(requireAuth);
productsRouter.get("/", listProductsController);
productsRouter.post("/", createProductController);
productsRouter.get("/:id", getProductController);
productsRouter.patch("/:id", updateProductController);
productsRouter.delete("/:id", deleteProductController);
