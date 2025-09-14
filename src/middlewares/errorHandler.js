// src/middlewares/errorHandler.js
export function notFound(req, res) {
  res.status(404).send("Not Found");
}
export function genericError(err, req, res, next) {
  console.error(err);
  res.status(500).send("Server Error");
}
