// src/controllers/reviewController.js
import Review from "../models/Review.js";
import Book from "../models/Book.js";

/** Recompute and store ratingAvg / ratingCount on Book */
async function recomputeBookRating(bookId) {
  const agg = await Review.aggregate([
    { $match: { bookId } },
    { $group: { _id: "$bookId", avg: { $avg: "$rating" }, count: { $sum: 1 } } }
  ]);
  const { avg = 0, count = 0 } = agg[0] || {};
  await Book.findByIdAndUpdate(bookId, { ratingAvg: avg, ratingCount: count }, { new: false });
}

/** GET /api/books/:id/reviews (public) */
export async function listReviews(req, res) {
  try {
    const { id } = req.params;
    const items = await Review.find({ bookId: id })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch (e) {
    console.error("[REVIEWS] list error:", e);
    res.status(500).json({ message: "Failed to load reviews" });
  }
}

/** POST /api/books/:id/reviews (auth) — create or update current user's review */
export async function upsertMyReview(req, res) {
  try {
    const { id } = req.params; // bookId
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    let { rating, comment } = req.body;
    rating = Number(rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be 1–5" });
    }
    comment = (comment || "").trim();

    const doc = await Review.findOneAndUpdate(
      { bookId: id, userId },
      { $set: { rating, comment } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await recomputeBookRating(doc.bookId);
    const updatedBook = await Book.findById(id).lean();
    res.status(201).json({ message: "Review saved", review: doc, bookRating: { avg: updatedBook.ratingAvg, count: updatedBook.ratingCount } });
  } catch (e) {
    // handle duplicate key (unique index) retries gracefully if needed
    console.error("[REVIEWS] upsert error:", e);
    res.status(500).json({ message: "Failed to save review" });
  }
}

/** DELETE /api/books/:id/reviews/my (auth) — remove my review */
export async function deleteMyReview(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const removed = await Review.findOneAndDelete({ bookId: id, userId });
    await recomputeBookRating(id);
    res.json({ message: removed ? "Review deleted" : "No review to delete" });
  } catch (e) {
    console.error("[REVIEWS] delete error:", e);
    res.status(500).json({ message: "Failed to delete review" });
  }
}
